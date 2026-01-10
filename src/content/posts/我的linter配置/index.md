---
title: "我的linter配置"
tags: ["code"]
createdAt: "2025-06-08"
origin: "https://zhuanlan.zhihu.com/p/1915069334205732300"
excerpt: "```text [tool.mypy] plugins = [\"returns.contrib.mypy.returns_plugin\"] disable_error_code = [\"import-untyped\"] [tool.ruff]"
---

```text
[tool.mypy]
plugins = ["returns.contrib.mypy.returns_plugin"]
disable_error_code = ["import-untyped"]

[tool.ruff]
# Enable pycodestyle (`E`), Pyflakes (`F`)
# Same as Black.
line-length = 88
indent-width = 4
target-version = "py310"

[tool.ruff.lint]
# Allow unused variables when underscore-prefixed.
select = ["E", "F", "W", "B", "UP"]
ignore = ["E203", "E501", "N806", "N803", "F401", "W293", "B007"]
dummy-variable-rgx = "^(_+|(_+[a-zA-Z0-9_]*[a-zA-Z0-9]+?))$"
fixable = ["ALL"]


[tool.ruff.format]
# Use single quotes for string literals
quote-style = "preserve"

# Indent with spaces, rather than tabs
indent-style = "space"

[tool.isort]
float_to_top = true
force_to_top = ["sys", "os"]
known_first_party = ["statellm"]
line_length = 88
profile = "black"

```

写完代码之后不知道干什么了，就试试这四个命令吧：

```bash
isort .
ruff format .
ruff check --fix .
mypy .
```

isort用于调整import. 值得一提，ruff有个isort扩展， 但是没有isort的float to top选项（并且似乎一直不愿意加入）。所以isort仍然必要。

ruff format + check， 不用多说。另外ignore列表是我调整之后觉得最合适的，不会遗漏严重错误，也不会疯狂报错。

所有格式化走完之后，用mypy进行类型检查。

可以有效帮助你避免90% bug而且看上去很酷（