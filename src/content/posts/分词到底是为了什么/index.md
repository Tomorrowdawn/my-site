---
title: "分词到底是为了什么？"
tags: ["math", "code"]
createdAt: "2025-12-09"
origin: "https://zhuanlan.zhihu.com/p/1981733511959435067"
excerpt: "进入大模型时代，大家总是频繁地 `AutoTokenizer.from_pretrained(path)` ，但是鲜有人关心分词器的具体作用。这一部分原因在于 BPE算法 已经十分成熟，另一部分原因在于大家的注意力集中在建模token序列之后的训练/推理过程中。 这篇文章准备做一些粗浅的讨论。 *维..."
---

进入大模型时代，大家总是频繁地 `AutoTokenizer.from_pretrained(path)` ，但是鲜有人关心分词器的具体作用。这一部分原因在于 BPE算法 已经十分成熟，另一部分原因在于大家的注意力集中在建模token序列之后的训练/推理过程中。

这篇文章准备做一些粗浅的讨论。 *维特根斯坦 说 “语言的界限就是我的世界的界限”。而大模型与人活在两个不同的世界中——Token与文字。* 这种分野很可能阻碍了行为对齐。

### 端到端LLM

如果我们需要一个大模型学习预料 $\mathscr{C}$ ，最合适的训练形式是什么？char? word? 词？字？我们想象一下，有没有一种东西，只要是计算机可表示的数据，就一定可以序列化为该形式？

没错，最合适的训练形式应当是 字节byte. 这个想法并不新奇，而且meta还搞了一个BLT [https://dl.fbaipublicfiles.com/blt/BLT__Patches_Scale_Better_Than_Tokens.pdf](https://link.zhihu.com/?target=https%3A//dl.fbaipublicfiles.com/blt/BLT__Patches_Scale_Better_Than_Tokens.pdf)

（不过效果很拉于是风评不好）

不过作为一篇文章来说，我们只关心它的数学形式。我们可以将这个端到端大模型的训练目标写成

$\max P(\mathscr{C}) \implies \max_{\theta} \sum_{x\in \mathscr{C}} \log P(x\mid \theta)$

即最大化语料的似然。

此处，让我们考虑使用字节表示。那么，一条样本 $x = (b_0, b_1, \cdots b_{n-1})$ ，是一个 字节流 。模型本身无法输出对于句子的概率预测（空间太大），只能转而输出下一个字节的概率。这样，以上目标就被写成了

$G_1 = \max_{\theta} \sum_{x\in\mathscr{C}} \sum_{i<n} \log p(b_i\mid \theta, b_{<i})$

注意，和上式不同，此时引入了对数据本身的顺序依赖（即多出的条件项 $b_{<i}$ ）

现在，由于计算效率问题，我们无法真的使用字节流，否则句子会太长太长。我们为了解决这个问题，引入一个 分词器 $\text{tok}$ ，这个分词器 **作用于原始字节流** ， 生成离散表示 $t_i$ 。

也就是说， $(t_0,\cdots t_{k-1}) = \text{tok}(b_0,\cdots b_{n-1})$

上述目标将被转而写成

$G_2 = \max_{\theta,\phi} \sum_{x\in\mathscr{C}} \sum_{i<k} \log p(t_i\mid \theta, t_{<i}, \{t_i\} = \text{tok}_{\phi}(x))$

看上去我们只需要令 $\theta' = \{\theta, \phi\}$ ，那么优化 $G_2$ 就是优化 $G_1$ ，对吗？

遗憾的是， **不对** 。

### Tokenization Hack

> 这个词组是我生造的

*定理：可以构造一个* $\text{tok}$ *，使得无论* $\theta$ *是什么，* $G_2$ *都得到了最大化。*

这个 $\text{tok}$ 的构造出人意料地简单：它为每个句子 $x$ 分配一个唯一 $\text{id}$ 。这种情况下， $G_2$ 中将没有求和，同时 $p(t\mid x) = 1$ （因为每个句子只有一个id），于是loss降到了0.

这个定理几乎就是 *语言的界限就是我的世界的界限* 的再现。换句话说，想要语言模型 $\theta$ 得到充分训练，分词 $\phi$ 就必须保持一定程度的复杂性。于是，在现代LLM过程中，分词和语言模型预训练是分开的两步。

### BPE算法

具体到分词算法本身来说，常年，分词算法受困于 OOV问题 。即，出现了不在词表里面的词。解决这个问题最简单自然的方法，就是用字节而不是char当做构建语言的基本单元。为了提高效率，我们需要为特定的字节组合赋予独特的token。

BPE就是这样一个非常简单的算法：

```python
def bpe(corpus, K):
   vocab = [1,2,3..., 256]
   for i in range(K):
      tokenize corpus by vocab
      for all token pair (t1, t2) in tokenized_corpus:
              freqs[(t1, t2)] += 1
      t1, t2 = argmax(freqs)
      vocab = vocab.add((t1, t2))
```

换句话说，每次找到出现频率最高的字节对byte pair，然后为他们赋予一个新的Token， 直到扩张到给定的K大小。

BPE分词的过程和查字典差不多，不过有一个问题值得细谈：当字节流是[1, 2, 3]， 但是(1,2)和(2,3)都被记录怎么办？为了解决这个问题，BPE会在add时记录词组被加入的顺序。显然，越早加入，它的频率越高。因此BPE实际的分词是一种贪心算法：对于字节流，先将其中序号最小的字节对变成token，再将第二小的变成token……直至完全分词。

> BPE是一种确定性分词算法。这意味着给定一个字节流，只有一种分词可能。还有一种分词方法是概率性分词算法，例如
> 
> Unigram
> 
> . 有兴趣的读者可以自行查阅。

### 字节与文字的错位

人类使用文字交流，而LLM使用token，如上所述，其实是字节对来进行交流。这就导致了一个问题，人类的文字并不能很好地转换成Token，反过来也一样。

1. 输入没问题：给定一个文本，由于字节流已经确定，所以token是确定的。
2. 输出有问题：给定不同的token序列，可能产生同一段文本。假设我们的词表是[1, 2, 3, (2, 3), (1, 2)]，那么序列[1, (2, 3)]和[(1, 2), 3]都可以生成最终字节流 [1, 2, 3]。

这个模糊性导致的一个直接问题是 retokenization drift

[](https://link.zhihu.com/?target=https%3A//blog.vllm.ai/2025/10/22/agent-lightning.html)

除了这两点以外，还有一个更隐蔽的问题：对于文本片段来说，tokenization结果不一样。这导致人与LLM无法很好地进行对齐。因为人类只能使用文本传达自己的意思。

例如，你想提供一个mcp工具，这个工具会向user消息中注入一个

```text
response(result....)
```

消息。但是，由于分词器的存在， `response` 不被保证每次都被解析为同一个token，比如说 `112` 。可能这一次，它的前面是 `the result is response` 而导致被分词为 `(is res)(ponse)` ，而下一次是 `response(1,2,3)` 被分词为 `(res)(pon)se(1... `

我对于这个问题的影响无法进行判断，因为我缺乏这方面的多次大规模训练经验，但是直觉上，这会让模型花很多精力去优化所有可能的token组合。