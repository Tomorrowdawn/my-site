---
title: "DFT是一个优化-p(x)的SFT"
tags: ["math"]
createdAt: "2025-08-23"
origin: "https://zhuanlan.zhihu.com/p/1942245874936836976"
excerpt: "DFT：监督微调（SFT）= 某种强化学习（RL）？ 请先阅读上文。同时安利一下我的一篇RL笔记 速通RL基础 约定多分类中 目标分类为 [公式] 。DFT中更新公式被写成 [公式] 但是，很显然，如果对右式子求导展开，我们就可以得到"
---

[DFT：监督微调（SFT）= 某种强化学习（RL）？](https://zhuanlan.zhihu.com/p/1937833929055924612)

请先阅读上文。同时安利一下我的一篇RL笔记 [速通RL基础](https://zhuanlan.zhihu.com/p/1938901554229928583)

约定多分类中 目标分类为 $y^*$ 。DFT中更新公式被写成

$\nabla J = \pi_{\theta}(y^*) \cdot \nabla_{\theta} [-\log \pi_{\theta}(y^*)]$

但是，很显然，如果对右式子求导展开，我们就可以得到

$\nabla J = -\pi_{\theta}(y^*)\cdot \frac{\nabla_{\theta} \pi_{\theta}(y^*)}{\pi_{\theta}(y^*)} = -\nabla_{\theta}\pi_{\theta}(y^*)$

显然， $J = -\pi_{\theta}(y^*)$

我们可以结合最常见的softmax激活来展示一下

$\nabla S = \nabla \frac{e^x}{1^Te^x} = \frac{1^Te^x\nabla e^x - \nabla(1^Te^x)(e^x)^T}{(1^Te^x)^2} = \frac{1^Te^x\text{diag}(e^x) - e^x(e^x)^T}{(1^Te^x)^2} = \text{diag}(\frac{e^x}{1^Te^x}) - (\frac{e^x}{1^Te^x})\cdot (\frac{e^x}{1^Te^x})^T = \text{diag}(S) - SS^T$

（我是矩阵导数高手(鼻青脸肿).jpg）

在这里 $S$ 就是softmax的输出，也就是 $\pi$ .

不难发现，激活的导数量级和 $\pi$ 的强度相关。 **如果对于正确答案的初始置信度较低，那么更新梯度也会更低** 。正常的 交叉熵 由于有 $1/\pi$ 进行反馈，会拉回置信度。

其效果见仁见智了，我只是推着玩玩（

另外发现这个矩阵导数硬控我的时间似乎比想象中要长，这里一步一步解释一下：

首先，对于梯度，我们默认使用分母布局。但是 $S$ 是一个向量，所以要特别小心

展开式中， $e^x$ 是一个向量， $1^Te^x$ 是一个标量。我们知道分母布局下的准则（ [分母布局下的矩阵微分速通](https://zhuanlan.zhihu.com/p/1939295178859975860) ）是：当我们需要从 $\nabla$ 中“提出”（即不对这一项微分）时，将其转置并右乘。由于 $1^Te^x$ 是一个标量所以是否转置，或者左右乘没有区别。而 $e^x$ 就需要非常小心（我就被硬控了半小时）。