# leafer-x-easy-snap

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

吸附插件，为 Leafer 应用提供元素移动自动吸附、对齐辅助线功能

### 安装
```bash
npm i leafer-x-easy-snap
```

### 使用方式： 【[playground](playground/src/main.ts)】

### 项目参考自：【[leafer-x-snap](https://github.com/tuntun0609/leafer-x-snap)】

### 配置
```typescript
interface SnapConfig {
  // 基于哪个容器计算吸附元素
  parentContainer?: IUI
  // 视口内元素才可吸附
  viewportOnly?: boolean
  // 自定义过滤规则
  filter?: (element: IUI) => boolean
  // 显示吸附线
  showLine?: boolean
  // 显示吸附点
  showLinePoints?: boolean
  // 吸附范围
  snapSize?: number
  // 吸附线的颜色
  lineColor?: string
  // 吸附点的尺寸
  pointSize?: number
  // 吸附线宽度
  strokeWidth?: number
  // 设置虚线风格
  dashPattern?: number[]
}
```

### 特点
1. 绘制对齐辅助线的策略变更：基于移动元素 x、y 轴各生成最多3条线，绘制时会显示所有在线上的点
2. 基于父容器查找兄弟元素进行吸附，含父容器
3. 支持通过`updateConfig` 方法动态修改配置，如：更新父容器
4. 支持 ⌨️ 上下左右 按键微调时显示辅助线
5. 可以在元素上设置 `isSnap` 属性来控制元素是否参与吸附计算，默认为 `true`

### 截图示例
<img alt="clip-style1.png" src="images/1.png" width="200"/>
<img alt="clip-style1.png" src="images/2.png" width="200"/>

## License

[MIT](./LICENSE) License © 2024-PRESENT [XiaDeYu](https://github.com/Xdy1579883916)

[MIT](https://github.com/tuntun0609/leafer-x-snap/blob/master/LICENSE) License © 2024-PRESENT [tuntun0609](https://github.com/tuntun0609)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/leafer-x-easy-snap?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/leafer-x-easy-snap
[npm-downloads-src]: https://img.shields.io/npm/dm/leafer-x-easy-snap?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/leafer-x-easy-snap
[bundle-src]: https://img.shields.io/bundlephobia/minzip/leafer-x-easy-snap?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=leafer-x-easy-snap
[license-src]: https://img.shields.io/github/license/Xdy1579883916/leafer-x-easy-snap.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/Xdy1579883916/leafer-x-easy-snap/blob/main/LICENSE
