---
title: "uv pip, pip, python -m pip区别"
tags: ["code"]
createdAt: "2025-08-10"
origin: "https://zhuanlan.zhihu.com/p/1937835776067998486"
excerpt: "昨天晚上装 verl 的时候装晕了……今天爬起来赶紧趁着还有点记忆记一下。 pip : pip会去找你的path里面的pip executable, 因此可能出现版本错误 uv pip ：什么都好，就是uv依赖解析过于严格了有时候某些extra使用了不兼容包（但你不关心这些extra）时报错。 py..."
---

昨天晚上装 verl 的时候装晕了……今天爬起来赶紧趁着还有点记忆记一下。

pip : pip会去找你的path里面的pip executable, 因此可能出现版本错误

uv pip ：什么都好，就是uv依赖解析过于严格了有时候某些extra使用了不兼容包（但你不关心这些extra）时报错。

python -m pip ：在虚拟环境中使用，python保证正确地选择这个虚拟环境，因此其内部pip会正确地安装。这也是为什么verl的官方uv脚本里面都是写 `python -m pip` `python -m uv` 之类的。

昨天晚上自作聪明uv pip然后被硬控一个小时。