---
title: "SGLang KV Cache管理"
tags: ["code"]
createdAt: "2025-12-04"
origin: "https://zhuanlan.zhihu.com/p/1979947858028435425"
excerpt: "精心调♥教哈Gemi得到的文档，感觉可读性已经非常好了～ 本文档深入探讨 SGLang 中 PagedAttention KV Cache 的管理机制，包括其初始化、 Block Table 的管理、Attention 计算的细节，以及一个简化的实现思路。 SGLang 的 KV Cache 是一个..."
---

精心调♥教哈Gemi得到的文档，感觉可读性已经非常好了～

## SGLang KV Cache 管理深度解析

本文档深入探讨 SGLang 中 PagedAttention KV Cache 的管理机制，包括其初始化、 Block Table 的管理、Attention 计算的细节，以及一个简化的实现思路。

### 1. KV Cache 的初始化：物理内存池的分配

SGLang 的 KV Cache 是一个在 GPU 上预先分配的巨大物理内存池。这个过程在每个 Python Worker 进程启动时，由 `sglang.srt.model_executor.model_runner.ModelRunner` 类通过其 `init_memory_pool` 方法完成。

### 1.1 Worker 内部架构

在深入细节之前，需要理解 Worker 进程的内部结构。当您运行 `python -m sglang.launch_server` 时，会启动一个或多个 Worker 进程。在每个 Worker 进程中：

- **主线程** : 运行 `Scheduler` ( `sglang.srt.managers.scheduler.Scheduler` )，负责接收来自 Router 的请求，进行批处理（Batching），并管理逻辑块（Logical Blocks）的分配与释放。
- **模型线程** : 运行 `ModelRunner` ( `sglang.srt.model_executor.model_runner.ModelRunner` )，它持有一个独立的线程，专门负责在 GPU 上执行模型的前向传播。 `ModelRunner` 拥有并管理物理的 KV Cache 内存池。

### 1.2 物理块数量 (NumBlocks) 的计算

`ModelRunner` 在 `init_memory_pool` 方法中调用 `profile_memory_for_kv_cache` 来确定物理块的总数 `NumBlocks` 。其计算逻辑如下：

1. **获取可用 GPU 显存** : 首先，通过 `sglang.srt.utils.get_available_gpu_memory(self.gpu_id)` 获取当前 GPU 的总可用显存 `total_gpu_memory` 。
2. **计算模型权重大小** : 调用 `self.model.get_weight_memory_bytes()` 来精确计算已加载的模型权重所占用的显存 `weight_mem_bytes` 。
3. **计算用于 KV Cache 的总显存** : SGLang 允许用户通过 `--mem-fraction-static` 参数（在 `ModelRunner` 中对应 `mem_fraction_static` ）来指定用于 KV Cache 的显存比例。计算公式为： # in sglang.srt.model_executor.model_runner.ModelRunner.profile_memory_for_kv_cache kv_cache_mem_bytes = int(total_gpu_memory * self.mem_fraction_static) - weight_mem_bytes 如果用户未指定 `mem_fraction_static` ，它默认为 `0.8` (80%)。
4. **计算单个物理块大小** : 单个物理块所需的显存通过以下方式计算： # in sglang.srt.model_executor.model_runner.ModelRunner.profile_memory_for_kv_cache block_size = self.server_args.page_size  # 通常为 16 head_size = self.model_config.head_dim num_heads = self.model_config.get_num_kv_heads(self.tp_size) dtype_size = self.model_config.dtype_size   single_block_mem_bytes = 2 * block_size * num_heads * head_size * dtype_size 这里的 `2` 代表 Key 和 Value 两个部分。
5. **最终 `NumBlocks` 计算** : # in sglang.srt.model_executor.model_runner.ModelRunner.profile_memory_for_kv_cache num_blocks = kv_cache_mem_bytes // single_block_mem_bytes

### 1.3 物理缓存的分配

在计算出 `num_blocks` 后， `ModelRunner` 在 `init_memory_pool` 方法中，通过调用 `torch.empty` 来实际分配物理缓存池。这个过程在 `sglang.srt.mem_cache.memory_pool.MHATokenToKVPool.__init__` 中完成：

```text
# in sglang.srt.mem_cache.memory_pool.MHATokenToKVPool.__init__
self.k_cache = torch.empty(
    (num_blocks, self.num_heads, self.page_size, self.head_size),
    dtype=self.dtype,
    device=self.device,
)
self.v_cache = torch.empty(
    (num_blocks, self.num_heads, self.page_size, self.head_size),
    dtype=self.dtype,
    device=self.device,
)
```

- **分布式场景** : 在张量并行（TP）模式下， `num_heads` 会被替换为 `num_heads / tp_size` ，因此每个 Worker 只分配其负责的注意力头的物理缓存。

### 2. 从逻辑序列到物理缓存： `req.blocks` 的角色

PagedAttention 的核心在于如何将一个逻辑上的 token 序列映射到物理上的、非连续的 KV 缓存块中。这个映射的桥梁，并非一个名为 `BlockTable` 的独立数据结构，而是存在于每个请求对象（ `Req` ）内部的一个关键属性： `blocks` 。

让我们从一个请求的视角出发，理解这个映射过程：

1. **逻辑视图** : 对于上层应用来说，一个请求 `req` 就是一个一维的 token 序列，例如 `[10, 20, 30, ...]` 。它的核心属性是 `req.input_ids` 和不断增长的逻辑长度 `req.seq_len` 。
2. **物理块映射 ( `req.blocks` )** : 为了将这个逻辑序列存入 KV 缓存， `Scheduler` 会为它分配物理块。 `req.blocks` 就是一个简单的 Python `list` ，其中 **按顺序** 存储了分配给这个请求的 **物理块的索引** 。

- **示例** : 假设 `BlockSize=4` ，一个长度为 9 的请求，可能被分配了 3 个物理块，其索引分别是 `[7, 2, 15]` 。那么 `req.blocks` 的值就是 `[7, 2, 15]` 。
- 这意味着，该请求的第 0-3 个 token 的 KV 存在物理块 7 中，第 4-7 个 token 存在物理块 2 中，第 8 个 token 存在物理块 15 中。

1. **最终形态 ( `block_tables_tensor` )** : 在模型进行推理之前， `Scheduler` 会将一个批次（ `ScheduleBatch` ）中所有请求的 `blocks` 列表收集起来，构建出 Attention 内核真正需要的输入：一个名为 `block_tables` 的二维 PyTorch 张量。

- **构建过程** : `Scheduler` 会找到当前批次中 `blocks` 列表最长的那个请求（假设其长度为 `max_blocks_per_seq` ），然后将所有请求的 `blocks` 列表都用0（pad）到这个长度，最后将它们堆叠（stack）成一个 `[batch_size, max_blocks_per_seq]` 的二维张量。

这个从 `req.blocks` (list of lists) 到 `block_tables` (tensor) 的转换过程，清晰地展示了 SGLang 是如何将不同长度、使用不同物理块的多个请求，打包成一个统一的、可供 GPU 高效处理的批次数据的。

### 2.1 `req.blocks` 的生命周期管理

对 `req.blocks` 的所有操作都由 `sglang.srt.managers.scheduler.Scheduler` 类统一管理，与请求的生命周期紧密耦合。

### **增 (Allocation)**

1. **时机** : 当一个新请求 `req` 在 `Scheduler.schedule()` 中首次被调度执行 Prefill 时。
2. **调用** : `Scheduler._alloc_request(req)`
3. **过程** :

- 根据请求的 prompt 长度 `req.prompt_len` 和 `BlockSize` ，计算出需要的物理块数量 `num_blocks` 。
- 调用 `self.token_to_kv_pool_allocator.alloc(num_blocks)` 从物理内存池中申请 `num_blocks` 个物理块。
- `alloc` 方法返回一个包含物理块索引的 Python `list` 。
- 这个 `list` 被赋值给 `req.blocks` ，完成了初始的块分配。

### **改 (Append)**

1. **时机** : 在 Decode 阶段，当请求 `req` 生成了一个新的 token，需要为其扩展 KV Cache 时。
2. **调用** : `Scheduler._append_token(req, next_token_id)`
3. **过程** :

- `_append_token` 首先检查 `req` 的最后一个逻辑块是否已满。
- 如果已满，它会调用 `self.token_to_kv_pool_allocator.alloc(1)` 申请一个新的物理块。
- 然后，将返回的新物理块索引 `append` 到 `req.blocks` 这个 list 的末尾，从而完成了 `req.blocks` 的扩展。

### **删 (Free)**

1. **时机** : 当请求 `req` 完成（生成结束、达到最大长度或被中止）时。
2. **调用** : `Scheduler._free_request(req)`
3. **过程** :

- 该方法会获取 `req.blocks` 中存储的所有物理块索引。
- 然后，它调用 `self.token_to_kv_pool_allocator.free(req.blocks)` ，将这些物理块归还到物理内存池中，以供后续请求复用。

通过这种方式，SGLang 将复杂的 KV Cache 管理细节（如物理地址、碎片整理等）对上层逻辑完全屏蔽， `Scheduler` 只需要通过操作 `req.blocks` 这个简单的 Python `list` ，就能高效、灵活地管理 GPU 显存。

### 3. Attention 计算：连接元数据与 CUDA 核

PagedAttention 的魔法发生在底层的 CUDA Attention 核中。 `ModelRunner` 在执行模型前向传播时，会调用这些核。SGLang 支持多种 Attention 后端（如 FlashInfer , Triton ），但其核心思想是一致的：将 `block_table` 等元数据传递给核函数，使其能够处理非连续的物理内存。

### 3.1 Attention 核的调用

Attention 核的调用发生在模型（例如 `LlamaForCausalLM` ）的 `forward` 方法内部，具体是在每个 `LlamaAttention` 层中。 `ModelRunner` 会将一个 `ForwardBatch` 对象作为参数传递进去，该对象封装了所有必要的元数据。

一个典型的调用栈如下：

1. `ModelRunner.forward_extend(batch)`
2. `self.model.forward(..., batch=batch)`
3. `LlamaModel.forward(..., batch=batch)`
4. `LlamaAttention.forward(..., batch=batch)`
5. `self.attn_backend.forward(...)` (例如 `sglang.srt.layers.attention.flashinfer_backend.FlashInferBackend.forward` )

在 `FlashInferBackend.forward` 中，最终会调用 FlashInfer 库提供的 CUDA 核，例如 `flashinfer.page_attention` 。

```text
# in sglang.srt.layers.attention.flashinfer_backend.FlashInferBackend.forward_extend

# ... 从 batch 对象中提取元数据 ...
qo_indptr = batch.qo_indptr
kv_indptr = batch.kv_indptr
kv_indices = batch.kv_indices
block_tables = batch.block_tables
# ... etc

o = flashinfer.page_attention(
    qo_indptr,             # Query-Output Index Pointer
    kv_indptr,             # Key-Value Index Pointer
    kv_indices,            # Key-Value Indices
    block_tables,          # The Block Table!
    self.k_cache,          # 物理 K-Cache 池
    self.v_cache,          # 物理 V-Cache 池
    q,                     # 当前批次的 Query 张量
    # ... 其他参数
)
```

### 3.2 关键元数据

传递给 Attention 核的元数据协同工作，使得核函数能够理解非连续的内存布局。以下是 `flashinfer.page_attention` 所需的关键参数（位于 `batch` 对象中）：

- **`q (torch.Tensor)`** : Query 张量，形状为 `[num_tokens, num_qo_heads, head_size]` ，包含了当前批次所有请求需要计算的新 token 的 query 向量。
- **`k_cache (torch.Tensor)`** , **`v_cache (torch.Tensor)`** : 指向 GPU 上完整物理缓存池的指针，形状为 `[num_blocks, num_kv_heads, page_size, head_size]` 。
- **`block_tables (torch.Tensor)`** : 形状为 `[batch_size, max_blocks_per_seq]` 的二维整数张量。这是我们之前讨论过的核心数据结构， `block_tables[i, j]` 的值是序列 `i` 的第 `j` 个逻辑块对应的物理块索引。
- **`qo_indptr (torch.Tensor)`** : Query-Output Index Pointer，形状为 `[batch_size + 1]` 的一维整数张量。它用于在扁平化的 `q` 张量中定位每个请求的 token 范围。第 `i` 个请求的 query token 位于 `q[qo_indptr[i]:qo_indptr[i+1]]` 。
- **`kv_indptr (torch.Tensor)`** : Key-Value Index Pointer，与 `qo_indptr` 类似，但它定义了每个序列在逻辑上的总长度（包括 prompt 和已生成的 token）。 `kv_indptr[i+1] - kv_indptr[i]` 就是第 `i` 个序列的 `context_len` 。

### 3.3 计算流程伪代码

Attention 核内部的计算可以被概念化为一个两层嵌套的循环：

```text
// 伪代码，以单个 Query token 的计算为例
// thread_id 对应一个特定的 head

// 1. 确定当前 token 属于哪个序列 (seq_idx)
//    (通过 qo_indptr 和 token 在批次中的全局索引可以反算出)

// 2. 获取该序列的上下文长度和 block_table
int context_len = kv_indptr[seq_idx+1] - kv_indptr[seq_idx];
int* block_table_for_seq = block_tables[seq_idx];

// 3. 遍历该 token 需要 attend 到的所有历史 Key/Value
for (int pos = 0; pos < context_len; ++pos) {
    // 4. 从 block_table 中查找物理位置
    int logical_block_idx = pos / PAGE_SIZE;
    int offset_in_block = pos % PAGE_SIZE;
    int physical_block_idx = block_table_for_seq[logical_block_idx];

    // 5. 从物理缓存中加载 Key 和 Value
    //    (地址计算: physical_block_idx * block_stride + ...)
    Key k = K_cache[physical_block_idx][thread_id][offset_in_block];
    Value v = V_cache[physical_block_idx][thread_id][offset_in_block];

    // 6. 计算 attention score 并累加
    score = dot_product(my_query, k);
    // ... softmax and accumulate value
}
```

关键在于第 4 步和第 5 步：CUDA 核利用 `block_table` 将一个逻辑上连续的 `pos` 索引，转换为物理上非连续的 `physical_block_idx` 和 `offset_in_block` ，从而正确地从 `K_cache` 和 `V_cache` 中加载出对应的 Key 和 Value 向量。这正是 PagedAttention 的精髓所在。