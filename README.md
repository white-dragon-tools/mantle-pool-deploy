# Roblox Deploy Action

Roblox Experience 部署 Action，提供槽位池管理和自动部署能力。

## 核心特性

- **槽位池管理** - 预定义固定数量的 Experience 槽位，按需分配
- **自动分配与回收** - 分支推送自动获取槽位，删除或超时自动释放
- **抢占机制** - 槽位不足时，自动抢占最久未更新的槽位
- **零外部依赖** - 使用 GitHub Repository Variable 存储状态，无需 AWS/S3
- **Mantle 状态持久化** - 自动保存和恢复每个槽位的 Mantle 状态（Experience ID、Place ID 等），无需配置远程状态存储

## 快速开始

### 1. 创建 Mantle 配置文件 `mantle.yml`

```yaml
# Mantle 游戏配置
name: my-game
description: |
  这是游戏描述
  支持多行

icon: assets/icon.png
thumbnails:
  - assets/thumbnail1.png
```

### 2. 创建 workflow

**固定环境 `.github/workflows/deploy-fixed.yml`**

```yaml
name: Deploy Fixed

on:
  push:
    branches: [main, dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/roblox-deploy-action@v1
        with:
          config: mantle.yml
          branch: ${{ github.ref_name }}
          access: ${{ github.ref_name == 'main' && 'public' || 'private' }}
          dynamic_description: ${{ github.ref_name != 'main' }}
          token: ${{ secrets.GITHUB_TOKEN }}
          roblosecurity: ${{ secrets.ROBLOSECURITY }}
```

**槽位池 `.github/workflows/deploy-pool.yml`**

```yaml
name: Deploy Pool

on:
  push:
    branches: [bugfix/*, feature/*]
  delete:
    branches: [bugfix/*, feature/*]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/roblox-deploy-action@v1
        with:
          config: mantle.yml
          pool: ${{ startsWith(github.ref_name, 'bugfix/') && 'bugfix' || 'feature' }}
          pool_count: ${{ startsWith(github.ref_name, 'bugfix/') && '10' || '5' }}
          branch: ${{ github.ref_name }}
          event: ${{ github.event_name }}
          access: private
          dynamic_description: true
          token: ${{ secrets.GITHUB_TOKEN }}
          roblosecurity: ${{ secrets.ROBLOSECURITY }}
```

### 3. 配置 GitHub Secrets

| Secret | 说明 |
|--------|------|
| `ROBLOSECURITY` | Roblox 登录 Cookie |
| `MANTLE_OPEN_CLOUD_API_KEY` | Roblox Open Cloud API Key |

## 配置说明

### mantle.yml

Mantle 游戏配置，参考 [Mantle 文档](https://github.com/blake-mealey/mantle)。

### Action 输入参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `config` | 是 | Mantle 配置文件路径 |
| `branch` | 是 | 当前分支名 |
| `pool` | 否 | 槽位池名称（槽位池模式） |
| `pool_count` | 否 | 槽位数量（槽位池模式必填） |
| `event` | 否 | 事件类型 `push`/`delete`（槽位池模式必填） |
| `access` | 是 | `public` 或 `private` |
| `dynamic_description` | 否 | 是否注入分支/commit 信息，默认 false |
| `token` | 是 | GitHub Token（需要 variables 写权限） |
| `roblosecurity` | 是 | Roblox 凭证 |

### Action 输出

| 输出 | 说明 |
|------|------|
| `environment` | 部署的环境名（如 `production`, `bugfix-3`） |
| `slot` | 槽位编号（仅动态槽位） |
| `preempted_branch` | 被抢占的分支（如有） |

## 槽位分配流程

```
分支 push
    │
    ▼
匹配固定环境? ──Yes──► 直接部署到该环境
    │
    No
    ▼
该分支已有槽位? ──Yes──► 复用，更新时间戳
    │
    No
    ▼
有空闲槽位? ──Yes──► 分配最小编号的空闲槽位
    │
    No
    ▼
抢占最久未更新的槽位 + 通知双方
```

## 定时清理

添加清理 workflow `.github/workflows/cleanup.yml`：

```yaml
name: Cleanup Slots

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cleanup
        uses: your-org/roblox-deploy-action@v1
        with:
          config: mantle.yml
          action: cleanup
          cleanup_days: 7
          token: ${{ secrets.GITHUB_TOKEN }}
```

## 技术实现

### 槽位存储

槽位状态存储在 GitHub Repository Variable，格式：

```json
{
  "max_slots": 10,
  "slots": {
    "1": {
      "branch": "bugfix/fix-login",
      "updated": "2024-01-15T10:30:00Z",
      "mantleState": "# Mantle state YAML content..."
    },
    "2": null,
    "3": {
      "branch": "bugfix/fix-ui",
      "updated": "2024-01-14T08:00:00Z",
      "mantleState": "..."
    }
  }
}
```

Variable 名称：`SLOT_POOL_{POOL_NAME}`（如 `SLOT_POOL_BUGFIX`）

每个槽位除了记录分支和更新时间，还会保存该槽位的 Mantle 状态（`.mantle-state.yml` 内容）。这样：
- 同一分支多次部署会复用已创建的 Roblox 资源
- 无需配置 S3/R2 等远程状态存储
- 槽位被抢占时，新分支会创建全新的 Experience

### 并发控制

使用重试机制处理并发冲突，最多重试 3 次。

### 发布
必须编译后再发布

## 工具链

- [Mantle](https://github.com/blake-mealey/mantle) - Roblox 部署工具
- [Rokit](https://github.com/rojo-rbx/rokit) - Roblox 工具链管理器
