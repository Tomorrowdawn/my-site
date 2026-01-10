---
title: "矩阵微分乘法法则速记"
tags: ["math"]
createdAt: "2026-01-05"
origin: "https://zhuanlan.zhihu.com/p/1939037328074049472"
excerpt: "[公式] 这个公式的记忆技巧是这样的： **对于标量对向量的求导，** 一次对一项求导，剩下的部分则视作一个整体拿出来， **转置然后左乘** 。 > 这是 > > 分子布局"
---

$\frac{\partial(\pmb u\cdot \pmb v)}{\partial \pmb x} = \frac{\partial \pmb u^T\pmb v}{\partial x} = \pmb v^T\frac{\partial\pmb u}{\partial \pmb x} + \pmb u^T \frac{\partial\pmb v}{\partial \pmb x}$

这个公式的记忆技巧是这样的： **对于标量对向量的求导，** 一次对一项求导，剩下的部分则视作一个整体拿出来， **转置然后左乘** 。

> 这是
> 
> 分子布局
> 
> 下的记号。分子布局，就是将分子看成列向量，竖着排（每一列的分子相同，每一行不同）。想象你的浏览器一开始是个竖长条，然后你拉伸它的右侧使其变成一个矩形的过程。

注意这个技巧对于向量对向量不成立，因为向量对向量定义为 雅可比矩阵 。比如说 d(Ax)/dx = A,没有转置。 关键在于标量本身没有行/列之分，而对向量求导强行扩展了行/列维度（所以导致了转置）。特别地，这个转置只出现在分子布局里面。

> 但是分子布局在向量/向量, 向量/矩阵，链式法则等方面都很方便…… 可能最方便的方法是异质计算（比如说标->向）使用
> 
> 分母布局
> 
> ，同质使用分子布局。

举例而言，通过这个技巧我们可以很容易得到 二次型 的导数：

$\frac{\partial\, x^TAx}{\partial{x}} = \frac{\partial (x\cdot Ax)}{\partial x} = x^TA + x^TA^T = x^T(A+ A^T)$

这里使用了另外一个技巧，就是把转置换成点乘然后应用上面的原则。这一步很重要否则很容易差一个转置。

我们来求解一个代表性问题展示如何使用矩阵微分迅速求解：

输入样本矩阵为X, 权重为w, 目标向量为y。求解 最小二乘法 的解w.

这等价于求解

$\frac{\partial (Xw-y)^T(Xw-y)}{\partial w} = 0$

$\frac{\partial (Xw-y)^T(Xw-y)}{\partial w} = 2(Xw-y)^TX = 0$

不难得到 $w = (X^TX)^{-1}X^Ty$

除法：

1. 以向量为输入的标量函数相除: $L = f(\pmb x)/g(\pmb x)$ . 这种情况下和标量除法的公式是一样的。(1/g(x)²) * [g(x) * (∂f/∂x) - f(x) * (∂g/∂x)]
2. 向量除以标量 $L = \pmb v/p$ . 这种情况下将其视作乘了一个标量 $1/p$ ,然后按部就班： 1. 是什么量对x求导？向量！那么就没有转置！ 2. 一次对一项求导，剩余部分左乘： $\frac{\partial  \pmb v/p}{\partial \pmb x}= \frac{1}{p}\cdot \frac{\partial \pmb v}{\partial \pmb x} - v \frac{1}{p^2}\frac{\partial p}{\partial \pmb x}$

特别地， 梯度 $\nabla$ 是一种标量对向量求导的记号。请注意， **分子布局下，** $\nabla f = (\frac{\partial f}{\partial x})^T$ . 差了一个转置。为了不出错，我们设计一个 $\nabla_N = \frac{\partial }{\partial x}$ ，这样， $\nabla = \nabla_N^T$ 。

这里介绍一个复杂的求导系统，感受一下真实计算的时候会发生什么：

$\nabla^2_{\theta} \log p(\theta) = \nabla\left(\nabla\log p\right) = \nabla(\frac{\nabla p}{p})$

到这一步可能还没问题，但是请注意了，内层已经变成了一个向量除以标量的混合情况，而不仅仅是标量了…… 同时，由于我们工作在分子布局下，不能再直接套用上面的公式，必须展开到的 $\nabla_N$ 才能套用。

所以：

$\nabla(\frac{\nabla p}{p}) = \nabla_N^T (\frac{\nabla^T_Np}p) = (\frac{p\nabla^{2}_Np^T - \nabla_Np\cdot \nabla_N^Tp}{p^2})^T = \frac{p\nabla_N^2p - \nabla_Np\cdot\nabla_N^Tp}{p^2}$

> 这个就是
> 
> hessian矩阵
> 
> 。由于它是对称矩阵，所以最后看上去有点脱裤子放屁。读者（您）可以试着直接用nabla推导（但是强行套用上面的微分公式），很快您将发现商的第二项出现了维度不匹配错误。
> 
> 这个例子生动地诠释了分母布局的必要性。在推导梯度的时候，没有烦人的转置。