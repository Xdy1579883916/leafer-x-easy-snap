/**
 * Snap 配置模块
 * 定义吸附功能的默认配置和预设主题
 */

import type { SnapConfig } from './types'
import { Box } from '@leafer-ui/core'

/**
 * 预设主题配置 - 粉色主题
 * 适用于需要突出显示吸附线的场景
 */
export const theme_1: SnapConfig = {
  lineColor: '#FF4AFF', // 粉色线条
  showLine: true, // 显示吸附线
  strokeWidth: 1, // 线条宽度
  dashPattern: null, // 虚线样式：6像素实线，2像素空白
  showLinePoints: true, // 显示吸附点标记
  distanceLabelStyle: {
    line: {
      dashPattern: [4, 2],
    },
    box: {
      fill: '#FF4AFF',
      cornerRadius: 4,
    },
    text: {
      fill: '#fff',
      fontSize: 10,
      textAlign: 'center',
      verticalAlign: 'middle',
      padding: [1, 4],
    },
  },
}

/**
 * 默认配置
 * 提供合理的默认值，确保吸附功能正常工作
 */
export const DEFAULT_CONFIG: Required<SnapConfig> = {
  // 默认只监听 move
  attachEvents: ['move'],
  // 父容器，null表示使用app.tree
  parentContainer: null,
  // 默认不过滤任何元素
  filter: () => true,
  // 吸附范围5像素
  snapSize: 5,
  // 吸附点标记尺寸4像素
  pointSize: 4,
  // 默认橙色线条
  lineColor: '#E03E1A',
  // 默认显示吸附线
  showLine: true,
  // 默认线条宽度1像素
  strokeWidth: 1,
  // 默认实线
  dashPattern: null,
  // 默认显示吸附点标记
  showLinePoints: true,
  // 默认显示距离标签
  showDistanceLabels: true,
  // 距离标签相关样式设置
  distanceLabelStyle: {
    line: {
      dashPattern: [4, 2],
    },
    box: {
      fill: '#E03E1A',
      cornerRadius: 4,
    },
    text: {
      fill: '#fff',
      fontSize: 10,
      textAlign: 'center',
      verticalAlign: 'middle',
      padding: [1, 4],
    },
  },
  // 显示元素等间距盒子
  showEqualSpacingBoxes: true,
  // 默认等宽间距Box的创建函数
  createEqualSpacingBox(): Box {
    const lineColor = this.lineColor
    return new Box({
      fill: lineColor,
      opacity: 0.3,
      zIndex: 5,
      visible: false,
    })
  },
}
