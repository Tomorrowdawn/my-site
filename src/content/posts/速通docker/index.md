---
title: "速通Docker"
tags: ["code", "philosophy"]
createdAt: "2025-12-26"
origin: "https://zhuanlan.zhihu.com/p/1987885175800098869"
excerpt: "最近本人有幸跑到公司里面工作，接触了一些现代化的协作流程。这篇文章简单记录一下Docker的使用方法。这篇文章假设读者已经了解Docker的基本作用，但是可能缺乏最佳实践（Best Practice）手册。我无意成为docker高手，因为细节是永远无法穷尽的；但我需要当我需要某个功能时能够立刻操作的..."
---

最近本人有幸跑到公司里面工作，接触了一些现代化的协作流程。这篇文章简单记录一下Docker的使用方法。这篇文章假设读者已经了解Docker的基本作用，但是可能缺乏最佳实践（Best Practice）手册。我无意成为docker高手，因为细节是永远无法穷尽的；但我需要当我需要某个功能时能够立刻操作的手册。So here it is.

### 为什么我不需要Docker

在介绍docker之前，我很想谈谈什么情况下不要用docker.

1. 在代码没有完成之前，不要使用docker. Docker不是依赖管理。它的目标是形成一个稳定的可复用进程。如果你正在开发阶段，请使用依赖管理工具。 当然，如果你的依赖100%不会变（通常是开发后期），那么仍然推荐使用docker. 在前期，如果你的环境一直在变，用docker等价于没用。
2. 不要用Docker打包GUI服务。By the way, WebUI是可以且推荐的。

### 为什么我需要Docker

1. 基线。 很多教程可能会提到docker想要终结“在我电脑上能跑”这个问题。但是我更愿意提醒，使用docker可以为你提供稳定的基线参考。
2. 资源隔离。 不用再担心你的agent rm -rf /了。
3. 省力。 只需稍加学习，使用docker能帮助你节省大量的精力而不是额外付出精力。

### Docker怎么用

如果你对docker中的所有奇技淫巧感兴趣，那么可以移步其他通用教程。这篇文章只会介绍最常用的最佳实践。

### Key Concept

1. 物理机。物理机就是你的机器本身。
2. 镜像。镜像包含了必要的数据文件和入口命令entrypoint.
3. 构筑镜像。构筑镜像类似于，起一个空的虚拟机器，在里面运行一些命令，将数据保存到内部，以便下次使用。这是由dockerfile指定的。
4. 容器 。激活镜像得到的运行时被称为容器。这是一个实时的机器。

### 构筑镜像

起点：

在你的物理机上，具有这样一个文件夹结构：

```text
my-awesome-python-app/
├── .dockerignore         # 定义 Docker 构建时忽略的文件和目录 
├── dockerfile.prod       # 用于构建生产环境镜像的 Dockerfile 
├── dockerfile.dev        # 开发环境 dockerfile 
├── requirements.txt      # Python 依赖文件
|
├── my_awesome_app/       # Python 包，存放所有应用源代码 
│   ├── __init__.py       # 将此目录标记为 Python 包
│   ├── main.py           # 应用主入口文件 
│   ├── routers/          # API 路由/控制器 
│   │   ├── __init__.py
│   │   └── items.py      # 示例路由模块
│   └── services/         # 业务逻辑 
│       ├── __init__.py
│       └── item_service.py # 示例服务模块
|
├── static/               # 存放静态文件 
│   └── index.html
|
└── .venv/                 # Python 虚拟环境

```

与所有常见教程不同的是，本教程强烈推荐使用具体的dockerfile而不是一个笼统的Dockerfile文件。这允许你为不同场景构筑不同依赖，最小化镜像。

> 但是，dockerignore却只能有有一份。我对这个设计很不满意但无可奈何。如果你需要编写不同的dockerignore, 可能需要再叠一层自动化，例如makefile动态生成dockerignore文件。

你需要编写dockfile来指定你需要哪些数据，安装什么运行时。

### Dockerfile

docker如何打包镜像？通过运行以下命令：

```text
docker build -t name:tag -f dockerfile.dev /path/to/your/build/context
```

这个命令会根据dockerfile.dev，在build-context路径下，构建名为name:tag的镜像。请注意该镜像并不直接存在你的工作路径下，而是由docker托管（且不建议你直接去操控镜像目录）。name:tag就是docker内部的通行标识符。

现在，你的脑海中应该有两台机器：

1. 一个被限定在build-context目录下的物理机。在构建过程中，你无法访问build-context的父目录。
2. 一个空白的虚拟机。这是镜像的前体（请允许我借用这个化学名词）。

接下来，我们介绍dockerfile的语法。请牢记以上两台机器，因为dockerfile中的命令， **有的运行在物理机上，有的运行在虚拟机上。**

有一条对任何指令都成立的准则：

任何Dockerfile指令，都会创建一个独立的docker层，使用 **隔离的环境** 运行。也就是说，指令的运行结果只有被持久化到磁盘上的才会储存。要想设置一些持久的环境变量/目录等，需要使用docker提供的专属命令

**CMD和Entrypoint的解析：**

这两者主要的区别在于运行时。docker run image时，可以在后面插入一些参数：

```text
docker run my-amazing-tool --param 1
```

如果使用CMD, 则CMD会被完整替换成为 `["--param", "1"]` 。容器会觉得莫名其妙。

如果使用Entrypoint, 则参数会被 **附加** 到列表后面。

如果你使用 `alias tool=docker run my-amazing-tool`

就会发现使用Entrypoint的话， `tool params` 简直就像你在使用某个CLI工具一样。

有趣的是这两者可以联用。如果设置了Entrypoint, 则CMD退化成向Entrypoint传递参数。（和位置无关，但是一般将cmd写在后面）。

这样的好处是，由于CMD可以被覆盖，它起到一个“提供默认参数”的作用。

**数据卷 Volume解析**

这一部分是Docker的重头戏。因为，一个完全隔离的docker容器能做的十分有限（只能通过stdout传输数据，例如echo hello打印）。我们需要一个办法将数据持久化到磁盘上。这是通过

`docker run -v src:path` 来做到的。

你可以通过多个 `-v` 指定多个挂载。 `src` 有两种形态：

1. 本地路径。这最适合快速本地调试和开发（例如将代码文件挂进去）。
2. 数据卷名。使用 `docker volume create python-app-logs` 创建一个数据卷。你可以使用docker管理，复用这些数据卷（例如使用另外一个容器启动）。 当你需要扩展你的部署时这很有用。

聪明的同学一定注意到了，如果我的本地刚好有一个 `logs` 文件夹，那么docker怎么判断到底是数据卷还是文件夹呢？答案是 **永远是数据卷** ，并且 如果你没有logs数据卷，docker不会报错而是帮你创建一个…… 所以挂载时一定要写 `./logs`

> 罚抄import this 一——千——遍，也——不——够！

.dockerignore:

dockerignore和gitignore是完全一样的。它用来防止例如 `COPY . app/` 这样的语句运行时，不小心将一些缓存/秘密 复制过去。这个文件也可以有效地帮助你缩减镜像。

需要注意，dockerignore必须在build-context路径下，且名字为.dockerignore.

### 构筑，获取，运行

完成dockerfile的编写之后，就进入了构筑/获取/运行阶段。这几个阶段主要是命令行，因此放到一起说明。

```text
docker build -t name:tag -f dockerfile .
```

运行该命令构筑镜像。没有更多需要解释的。

```text
docker pull name:tag
```

从镜像库拉取镜像保存到本地。如果你对换源感兴趣，可参考 [Docker换源加速(更换镜像源)详细教程（2025.1最新可用镜像，全网最详细）【测试成功】](https://zhuanlan.zhihu.com/p/28662850275)

运行命令有很多细节需要说明，因为它会涉及到运行时资源分配（比如说，我想要一个gpu怎么办？）。

其基本命令如下：

```text
docker run name:tag 
       -p <host>:<container> \ #host可以带ip。如127.0.0.1:8080:80
       -v <src>:<dst>\
       -e <name>=<value> \ #设置环境变量
       --env-files ./.env \ #通过 dot env文件规范设置。
       -m "512m" (or "2g") \#设置内存
       --cpus num\
       --gpus num or "device=1,2" or all \ #分配可见GPU. 注意镜像内必须有cuda-toolkit
       -d \#后台运行
       -it \#提供一个交互式终端
       --rm \#运行结束后立即销毁。非常推荐。
       --name my-cool-name\
```

注解应当比较清楚了。

有一个高级用法需要提一下。由于nv卡被禁是一个大趋势，学会向docker挂载非nv卡是很有必要的。说白了，不管是什么显卡，都只是一个外部设备，和鼠标键盘什么的没有区别。docker有一种统一的挂载外部设备的方法： `--device`

因为linux中不管什么设备，最终只是一个文件形态。所以关键就在于找到device对应的文件路径，然后通过--device挂进去。同时还需要group-add（如果设备有权限限制），授权该container访问。随后，如果有驱动文件，还需要通过 `-v` 挂进去。这里贴一个vllm的启动命令：

```text
# Update the vllm-ascend image
export IMAGE=quay.io/ascend/vllm-ascend:v0.7.3.post1
docker run --rm \
--name vllm-ascend \
--device /dev/davinci0 \
--device /dev/davinci_manager \
--device /dev/devmm_svm \
--device /dev/hisi_hdc \
-v /usr/local/dcmi:/usr/local/dcmi \
-v /usr/local/bin/npu-smi:/usr/local/bin/npu-smi \
-v /usr/local/Ascend/driver/lib64/:/usr/local/Ascend/driver/lib64/ \
-v /usr/local/Ascend/driver/version.info:/usr/local/Ascend/driver/version.info \
-v /etc/ascend_install.info:/etc/ascend_install.info \
-v /root/.cache:/root/.cache \
-p 8000:8000 \
-it $IMAGE bash
```

Docker Compose 等暂待后续……