---
title: "SgLang整体流程解析"
tags: ["code"]
createdAt: "2025-12-04"
origin: "https://zhuanlan.zhihu.com/p/1979931283678320513"
excerpt: "精心调♥教哈Gemi得到的文档，感觉可读性已经非常好了～ 本文档旨在介绍 SGLang 的整体执行流程，从入口开始，涵盖关键模块的交互，并为后续深入理解推测解码等高级功能提供基础。 SGLang 采用的是一个典型的“ API 网关 + 多 Worker”的分布式架构，以实现高吞吐量和可扩展性。 1...."
---

精心调♥教哈Gemi得到的文档，感觉可读性已经非常好了～

## SGLang 整体执行流程

本文档旨在介绍 SGLang 的整体执行流程，从入口开始，涵盖关键模块的交互，并为后续深入理解推测解码等高级功能提供基础。

### SGLang 宏观架构： Router-Worker 模式

SGLang 采用的是一个典型的“ API 网关 + 多 Worker”的分布式架构，以实现高吞吐量和可扩展性。

1. **API Server (Router)** :

- **实现** : 这是一个用 Rust 编写的高性能 `sgl-router` 进程，其入口点是 `sgl-router/src/main.rs` 。
- **职责** :

1. **Inference Worker (Python Worker)** :

- **实现** : 这是一个 Python 进程，通过 `python -m sglang.launch_server` 命令启动。其核心实现在 `python/sglang/srt/` 目录下，特别是 `entrypoints/http_server.py` 和 `entrypoints/engine.py` 。
- **职责** :

### 请求处理流程

一个典型的请求流程如下：

1. 用户客户端向 SGLang 的 API Server (Router) 发送一个标准的 OpenAI 格式的 API 请求。
2. Router 接收到请求，并根据其内部的负载均衡策略，从健康的 Worker 池中选择一个最合适的 Worker。
3. Router 将请求转发给选定的 Worker。
4. Worker 接收到请求，调用其内部的 `engine` ，执行模型的前向传播。
5. 在执行过程中，Worker 会与 GPU 上的 KV Cache 交互，读取历史 token 的 KV 值，并写入新生成 token 的 KV 值。
6. Worker 将推理结果返回给 Router。
7. Router 最终将结果返回给用户客户端。

### `Engine` 初始化

SGLang 的运行时生命周期由 `Engine` 类（位于 `python/sglang/srt/entrypoints/engine.py` ）的初始化过程驱动。这个过程精心编排了一系列子进程和服务的启动。

### 初始化流程概述

1. **配置解析 ( `ServerArgs` )** : `Engine` 的构造函数接收所有配置参数，并将它们统一封装在 `ServerArgs` 对象中。这包括模型路径、并行化策略 ( `tp_size` , `pp_size` , `dp_size` )、内存配置等。
2. **环境设置 ( `_set_envs_and_config` )** : 设置 NCCL、CUDA 等底层库所需的环境变量，并配置日志、资源限制（ulimit）等。
3. **启动 Scheduler 进程 ( `run_scheduler_process` )** : 这是最核心的步骤。

- **单机/单 DP 分片** : 根据 `tp_size` 和 `pp_size` 启动多个 `Scheduler` 进程。每个进程负责一个 GPU，并通过 `tp_rank` 和 `pp_rank` 参数被告知其在张量/流水线并行中的角色。
- **多 DP 分片 ( `dp_size > 1` )** : 启动一个 `DataParallelController` 进程，该进程内部会为每个 DP rank 启动一组 `Scheduler` 进程。

1. **启动 Detokenizer 进程 ( `run_detokenizer_process` )** : 启动一个独立的进程，专门负责将模型输出的 token IDs 反序列化为文本。
2. **初始化 Tokenizer ( `_init_tokenizer_manager` )** : 在主进程中创建 `TokenizerManager` ，负责接收外部请求、应用聊天模板、并将 tokenized 的结果通过 ZMQ 发送给 `Scheduler` 。
3. **等待与同步** : 主进程会等待所有 `Scheduler` 进程加载完模型并发送 “ready” 信号后，才完成初始化。

### Python 端多进程架构

`Engine` 初始化过程的核心是创建一组协同工作的 Python 进程。这种多进程架构旨在将不同的任务隔离开，以提高整体的吞吐量和鲁棒性。以下是主要的进程及其关系：

```text
+----------------------------------------------------------------------------------------------------------+
|                                     Python Worker Processes (TP > 1)                                     |
|                                                                                                          |
|  +-----------------------+      (ZMQ, Broadcast to ALL)       +---------------------------+              |
|  | Main Process (Engine) |----------------------------------->| Scheduler Process (GPU 0) |              |
|  | - TokenizerManager    |                                     | Scheduler Process (GPU 1) |              |
|  +-----------------------+                                     |            ...            |              |
|            ^                                                    | Scheduler Process (GPU N-1)|              |
|            | (forks)                                            +---------------------------+              |
|            |                                                                  |                            |
|            |                               (All Schedulers make IDENTICAL scheduling decisions)            |
|            |                                                                  |                            |
|  +---------v-------------+                                                    v                            |
|  | Detokenizer Process   |<--(ZMQ from rank 0)------------------ (One ModelRunner thread per Scheduler)    |
|  | - Converts IDs to text|                                      (Sync via NCCL All-Reduce during forward) |
|  +-----------------------+                                                                                 |
|                                                                                                          |
+----------------------------------------------------------------------------------------------------------+
```

- **Main Process (Engine)** : 这是 `python -m sglang.launch_server` 命令启动的父进程。它不直接参与模型计算，主要职责是：

- **Scheduler Process** : 这是推理工作的核心。

> 敏锐的读者可能已经从上图中注意到一个关键细节：当
> 
> `tp_size > 1`
> 
> 时，系统中存在多个并行的
> 
> `Scheduler`
> 
> 进程。那么，SGLang 是如何确保在没有中央协调者的情况下，所有这些并行的
> 
> `Scheduler`
> 
> 能够做出完全一致的决策呢？
> 
> 关键在于：
> 
> **每个 `Scheduler` 都在独立地进行决策，但它们总能得到相同的结果。**
> 
> 因为Scheduler使用了确定性调度算法。这保证没有scheduler瓶颈阻塞整个系统。更重要的是，相比于Scheduler -> N个worker，它省掉了一次进程间通信。

- **Detokenizer Process** : 这是一个辅助进程。

这种分离的设计使得 CPU 密集型的任务（如 tokenization）和 GPU 密集型的任务（模型推理）可以并行进行，最大化了硬件利用率。

### 模型与权重加载

- **`Scheduler` -> `TpModelWorker` -> `ModelRunner`** : 这是模型权重加载的核心链条。
- **`ModelRunner`** :

### 核心组件与执行流程

SGLang 的执行流程主要围绕以下几个核心组件展开：

- **`Engine`** : 作为系统的总协调器，负责接收请求、管理调度器和 worker，并返回最终结果。
- **`Scheduler`** : 位于 `python/sglang/srt/managers/scheduler.py` ，负责对传入的请求进行批处理（batching）和调度。
- **`TpModelWorker`** : 位于 `python/sglang/srt/managers/tp_worker.py` ，代表一个持有模型分片（TP/PP shard）的工作进程。它在 `ModelRunner` 的帮助下，在 GPU 上执行实际的模型推理。
- **`EAGLEWorker`** : 位于 `python/sglang/srt/speculative/eagle_worker.py` ，是 `TpModelWorker` 的一个特殊版本，专门用于执行 EAGLE 推测解码。

### 单机执行流程

1. **请求接收** : `Engine` 接收来自用户的 `GenerationRequest` 。
2. **调度** : `Engine` 将请求发送给 `Scheduler` 。 `Scheduler` 将多个请求组合成一个批次（ `ScheduleBatch` ）。
3. **模型推理** : `Scheduler` 将批处理后的请求分发给 `TpModelWorker` （或 `EAGLEWorker` ）。
4. **前向传播** : `TpModelWorker` 在其持有的模型分片上执行前向传播。
5. **返回结果** : `Engine` 从 `Scheduler` 获取最终的生成结果，并以流式方式返回给用户。

### Scheduler 核心调度循环： `handle_requests`

`Scheduler` 的核心是一个位于 `handle_requests` 方法中的 `while True` 无限循环。这个循环是 SGLang 推理服务的心脏，它持续不断地执行以下任务，驱动所有请求从接收到完成的整个生命周期。

这个核心循环的伪代码如下：

```text
# in sglang.srt.managers.scheduler.Scheduler.handle_requests
def handle_requests(self):
    while True:
        # 1. 接收新请求
        # 尝试从 Router 非阻塞地接收一个或多个请求
        new_req_inputs = self._recv_new_requests()

        # 2. 处理新请求
        # 将接收到的原始请求输入 (e.g., TokenizedGenerateReqInput)
        # 转换为内部的 Req 对象，并加入到 self.waiting_queue
        for req_input in new_req_inputs:
            self._request_dispatcher.dispatch(req_input)

        # 3. 调度并执行模型
        # 这是最关键的步骤，决定下一个要执行的批次
        self.schedule()

        # 4. 处理模型输出
        # schedule() 内部会调用模型并处理其输出，
        # 包括更新请求状态、发送 token 回复等。
```

### 请求生命周期详解

让我们跟踪一个生成请求（ `TokenizedGenerateReqInput` ）的完整生命周期，以理解上述循环是如何工作的：

1. **请求到达** :

- Router 将一个来自用户的 HTTP 请求转换为 `TokenizedGenerateReqInput` 对象，并通过 ZMQ Socket 发送给一个 Worker 的 `Scheduler` 进程。
- 在 `handle_requests` 循环的第 1 步， `_recv_new_requests` 方法通过 `self.router_port.recv_pyobj()` 接收到这个对象。

1. **请求入队** :

- 循环的第 2 步调用 `self._request_dispatcher` ，它会匹配到 `handle_generate_request` 方法。
- `handle_generate_request` 方法进行一系列检查（如长度校验），然后创建一个核心的 `Req` 对象。这个对象封装了请求的所有信息，包括 prompt token、采样参数、状态等。
- 最后，这个 `Req` 对象被添加到 `self.waiting_queue` 列表中，等待被调度。

1. **调度决策 ( `schedule` 方法)** :

- 循环的第 3 步调用 `self.schedule()` ，这是调度的核心。
- `schedule()` 方法首先会尝试将 `self.waiting_queue` 中的新请求（prefill 请求）和 `self.running_batch` 中正在运行的请求（decode 请求）合并。
- 它使用 `self.policy.schedule()` 策略函数来决定哪些请求可以被调度。策略会考虑当前系统的负载、KV Cache 的剩余空间、请求优先级等因素。
- 调度的结果是一个 `ScheduleBatch` 对象，它包含了所有被选中要进行 prefill 或 decode 的请求。

1. **模型执行** :

- `schedule()` 方法根据 `ScheduleBatch` 的内容，决定是执行 prefill 还是 decode。
- **Prefill** : 如果批次中包含新的请求， `schedule()` 会调用 `self.model_worker.forward_prefill(batch)` 。
- **Decode** : 如果批次中只包含正在运行的请求，则调用 `self.model_worker.forward_extend(batch)` 。
- 这些 `forward_*` 方法会触发底层的 `ModelRunner` 在 GPU 上执行实际的模型前向传播。

1. **输出处理与状态更新** :

- 模型执行完成后， `schedule()` 方法会调用 `self._process_outputs(output_dict)` 来处理返回的结果。
- `_process_outputs` 会遍历批次中的每一个请求，更新它们的状态：

1. **资源释放** :

- 对于已完成的请求， `schedule()` 方法会调用 `self._free_request(req)` 。
- `_free_request` 会释放该请求占用的所有资源，最重要的是调用 `self.tree_cache.free(req)` 来归还其占用的 KV Cache 物理块。这些物理块随后可以被新的请求重新使用。

通过这个 `handle_requests` -> `schedule` -> `model_worker.forward` -> `_process_outputs` 的闭环， `Scheduler` 得以高效地处理大量并发请求，实现了持续的批处理（Continuous Batching）。

### 并行化与 Tensor 形状

SGLang 主要使用张量并行（ Tensor Parallelism , TP）来加速单次 forward 的计算。为了避免 padding 带来的计算浪费，SGLang 的底层 Kernel 采用“摊平”的物理视图，通过 `qo_indptr([B+1])` 索引来区分批次中的不同序列。

- **定义** :

### 关键 Tensor 的形状变化 (TP > 1)

- **核心思想** :