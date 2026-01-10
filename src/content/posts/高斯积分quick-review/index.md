---
title: "高斯积分quick review"
tags: ["math"]
createdAt: "2025-12-22"
origin: "https://zhuanlan.zhihu.com/p/1986488990581421629"
excerpt: "高斯积分 是一个典型的不可积分，但是特定定积分有解的常用积分。由于 高斯分布 的广泛使用，熟练使用高斯积分还原进行速算是很有必要的。对于 链路 稍长的算法，能够速算出一个大概表达式相比只能定性是天差地别的。 高斯积分表达式 [公式] > 有一些也去掉 /2 ，相应的结果记作 >"
---

高斯积分 是一个典型的不可积分，但是特定定积分有解的常用积分。由于 高斯分布 的广泛使用，熟练使用高斯积分还原进行速算是很有必要的。对于 链路 稍长的算法，能够速算出一个大概表达式相比只能定性是天差地别的。

高斯积分表达式

$\int_{-\infty}^{\infty} e^{-x^2/2}\mathrm{d}x = \sqrt{2\pi}$

> 有一些也去掉 /2 ，相应的结果记作
> 
> $\sqrt{\pi}$
> 
> 。但是高斯分布永远带着/2, 所以这个形式最容易使用。

证明很简单

$S=\int_{-\infty}^{+\infty}e^{-x^2/2}\mathrm{d}x$

$S^2=\int_{-\infty}^{+\infty}e^{-x^2/2}dx \cdot \int_{-\infty}^{+\infty} e^{-y^2/2}\mathrm{d} y = \int_{\mathrm{plane}} e^{-(x^2+y^2)/2}\mathrm{d}x\mathrm{d}y$

这显然是一个圆，换元到 极坐标系 $x = r\cos\theta, y=r\sin\theta$ , $dxdy = |J|\mathrm{d}r \mathrm{d}\theta = r\mathrm{d}r \mathrm{d}\theta$

完事儿了之后我们得到

$S^2 = \int_{0}^{2\pi}\int_{0}^{+\infty}re^{-r^2 / 2}\mathrm{d}r\mathrm{d}\theta = \int_{0}^{2\pi}\int_{0}^{+\infty}e^{-r^2 / 2}\mathrm{d}\frac{r^2}{2}\mathrm{d}\theta$

里面显然是 $1 - 0 = 1$ ，所以 $S^2 = 2\pi$

于是原积分是 $\sqrt{2\pi}$

只需记忆高斯积分的表达式，就可以轻松记忆高斯分布。因为

1. 概率需要归一化。所以高斯分布有一个系数 $1/\sqrt{2\pi}$
2. $N(\mu, \sigma)$ 相当于 $\mu + \sigma N(0, 1)$ ，所以 $x$ 要变成 $(x-\mu)/\sigma$
3. 由于 $x$ 变成了 $(x-\mu)/\sigma$ ，概率积分的时候变成了 $d(\frac{x-\mu}{\sigma})$ ， 因此高斯分布的系数还需要补一个 $1/\sigma$