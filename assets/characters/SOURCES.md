# 角色素材来源与加工说明

抓取/核对日期：2026-11-13。角色与作品归《罗小黑战记》及相应权利人所有。本项目为非商业同人小游戏。下列 GitHub 仓库是本次实际下载到的素材收录来源，不意味着其作者拥有角色版权，亦不意味着原素材已获得新的开源许可。

## 实际用于游戏的素材

| 角色 | 来源页面（固定提交） | 原始文件直链 | 本地原件 | 加工 |
| --- | --- | --- | --- | --- |
| 罗小黑 | [IXiaoHei / licking the claw.gif](https://github.com/jiang-taibai/IXiaoHei/blob/94d7eb55b85dcf10e47ad002d0417d0fb4d91436/src/org/taibai/hellohei/img/licking%20the%20claw.gif) | [GIF](https://raw.githubusercontent.com/jiang-taibai/IXiaoHei/94d7eb55b85dcf10e47ad002d0417d0fb4d91436/src/org/taibai/hellohei/img/licking%20the%20claw.gif) | `../references/licking-the-claw.gif` | 提取第 0 帧，保留透明边缘，裁去透明空白 |
| 嘿咻 | [IXiaoHei / play heixiu.gif](https://github.com/jiang-taibai/IXiaoHei/blob/94d7eb55b85dcf10e47ad002d0417d0fb4d91436/src/org/taibai/hellohei/img/play%20heixiu.gif) | [GIF](https://raw.githubusercontent.com/jiang-taibai/IXiaoHei/94d7eb55b85dcf10e47ad002d0417d0fb4d91436/src/org/taibai/hellohei/img/play%20heixiu.gif) | `../references/play-heixiu.gif` | 第 0 帧右下角独立嘿咻，裁剪矩形 `(180,185,222,219)`，沿轮廓添加抗锯齿透明蒙版，去除接触处的小黑脚部碎片，未重绘 |
| 无限 | [2048LXH / 512.jpg](https://github.com/Hakuin123/2048LXH/blob/20e465f85a525ed283a51579b5c6174f3abca127/src/img/512.jpg) | [JPEG](https://raw.githubusercontent.com/Hakuin123/2048LXH/20e465f85a525ed283a51579b5c6174f3abca127/src/img/512.jpg) | `../references/wuxian-chibi.jpg` | 原图为蓝发无限 Q 版半身头像；只移除与边缘连通的近白背景，保留五官内部白色 |
| 山新 | [2048LXH / 64.jpg](https://github.com/Hakuin123/2048LXH/blob/20e465f85a525ed283a51579b5c6174f3abca127/src/img/64.jpg) | [JPEG](https://raw.githubusercontent.com/Hakuin123/2048LXH/20e465f85a525ed283a51579b5c6174f3abca127/src/img/64.jpg) | `../references/shanxin-chibi.jpg` | 原图为橙发、蓝色蝴蝶结的角色山新（不是配音演员照片）；只移除边缘连通近白背景 |

所有成品为 256×256 RGBA PNG。`idle` 是经裁剪、缩放和透明处理的原素材；`charge` 横向拉伸、纵向压缩，`jump` 轻微拉伸并旋转 -9°，`fall` 旋转 24°。这些是小游戏所需的变形差分，不是新增官方姿态/表情，也不是官方精灵表。嘿咻原件很小（42×34 裁剪），只用于小尺寸显示；无限、山新原件为 107×107，属于头像棋子，而非全身角色。

生成脚本：`../../tools/build_character_assets.py`，使用 Pillow。网站在运行时只读取本地 PNG，不热链上游资源。`manifest.json` 提供头像、四种差分、来源和署名，路径以网站根目录为基准。

## 检索、角色核对和保留参考

| 内容 | 核对页面 | 原图直链 | 本地原件 | 说明 |
| --- | --- | --- | --- | --- |
| 罗小黑跑步图 | [萌娘百科：罗小黑](https://zh.moegirl.org.cn/%E7%BD%97%E5%B0%8F%E9%BB%91) | [PNG](https://storage.moegirl.org.cn/moegirl/commons/f/fb/%E7%BD%97%E5%B0%8F%E9%BB%91%E5%A5%94%E8%B7%91.png) | `../references/xiaohei-running.png` | 参考，未用于成品；内部有白底，与游戏风格不如透明 GIF 一致 |
| 无限立绘 | [萌娘百科：无限（罗小黑战记）](https://zh.moegirl.org.cn/%E6%97%A0%E9%99%90(%E7%BD%97%E5%B0%8F%E9%BB%91%E6%88%98%E8%AE%B0)) | [JPEG](https://storage.moegirl.org.cn/moegirl/commons/1/12/Wuxian_madeByShungua.jpg) | `../references/wuxian-portrait.jpg` | 署名孙呱的二次创作参考，保留原水印；未用于游戏成品 |
| 无限动画截帧 1 | 同上 | [PNG](https://storage.moegirl.org.cn/moegirl/commons/d/da/Wuxian_1.png) | `../references/wuxian-frame1.png` | 动画截图，保留完整图片；未用于成品 |
| 无限动画截帧 2 | 同上 | [PNG](https://storage.moegirl.org.cn/moegirl/commons/f/f8/Wuxian_2.png) | `../references/wuxian-frame2.png` | 动画截图，保留完整图片；未用于成品 |
| 山新 | [萌娘百科：山新（罗小黑战记）](https://zh.moegirl.org.cn/%E5%B1%B1%E6%96%B0(%E7%BD%97%E5%B0%8F%E9%BB%91%E6%88%98%E8%AE%B0)) | [JPEG](https://storage.moegirl.org.cn/moegirl/commons/f/fd/20180523222626_vkkoq.jpg) | `../references/shanxin-portrait.jpg` | 橙发帽装参考，未用于成品 |
| 小黑桌宠其他动作 | [IXiaoHei 素材目录](https://github.com/jiang-taibai/IXiaoHei/tree/94d7eb55b85dcf10e47ad002d0417d0fb4d91436/src/org/taibai/hellohei/img) | 见该目录 | `../references/bye.gif`、`../references/icon.png` | 下载作为角色核对，未用于成品 |

访问方式：公开 HTTP 下载，无登录、无验证码绕过。Fandom 站点超时，未作为素材来源。
