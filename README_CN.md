# 什行的测试 Add-on

[![English](https://img.shields.io/badge/English-README--EN.md-blue)](README.md)

## 概述

本插件是为ShrHang所在的创造服所写的的测试插件，旨在实现一些实用的功能以提升玩家的游戏体验。  
它使用微软官方的开发者包进行开发，具体的构建方法请参考下方链接的文档说明：  
[![REAMDE](https://img.shields.io/badge/Mojang-README--原文件-green)](README_ORIGIN.md)  
[![开发者文档](https://img.shields.io/badge/Mojang-开发者文档-green)](https://learn.microsoft.com/zh-cn/minecraft/creator/documents/scripting/next-steps?view=minecraft-bedrock-stable)  
[![仓库](https://img.shields.io/badge/Mojang-开发者包仓库-green)](https://github.com/microsoft/minecraft-scripting-samples/)  

## 介绍

本插件实现了菜单功能、领地功能，以及一些自定义命令。  
除特殊说明外，下述命令均可在游戏中由玩家直接使用。  

### 菜单功能

- `/shh:menu`：打开菜单
- `/shh:openmenu [player]`：仅op，为指定玩家打开菜单

打开菜单的命令会在玩家屏幕上显示一个简单的UI界面，可以实现**路径点传送**、**切换游戏模式**、**管理领地**的功能。  

### 领地功能（By LazyLeo）

- `/shh:claim`：创建领地（站在起点输入一次，站在终点再输入一次）
- `/shh:claims`：查看自己的领地列表
  
允许玩家创建多个领地，只有所有者和被信任的玩家可以在领地内与方块、实体交互。

- `/shh:unclaim`：删除所在位置的领地
- `/shh:tpclaim <claim>`：传送到自己的指定领地
- `/shh:trust <player>`：信任玩家
- `/shh:untrust <player>`：取消信任玩家

仅领地所有者可使用上述命令。

### 自定义命令

- `/shh:tppos <location>`：传送到指定坐标
- `/shh:tpentity <entity>`：传送到指定实体

路径点传送功能会将玩家传送到预设的坐标位置，预设的坐标位置可以在 [`tpPoints.ts`](scripts/tpPoints.ts) 文件中进行修改。

## 构建方法的简要说明

本插件的构建方法与官方的开发者包示例项目一致，主要步骤如下：

1. 克隆项目到本地。
2. 在项目根目录下执行命令安装依赖：
  ```powershell
    npm i
  ```
3. 在项目根目录下执行构建命令：
  ```powershell
    npm run build
  ```
4. 将构建生成的 `dist/pakcage/` 文件夹中的内容导入到 Minecraft 中。
