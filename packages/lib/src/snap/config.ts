/**
 * Snap 配置模块
 * 定义吸附功能的默认配置和预设主题
 */

import type { SnapConfig } from './types'

/**
 * 预设主题配置 - 粉色主题
 * 适用于需要突出显示吸附线的场景
 */
export const theme_1: SnapConfig = {
  lineColor: '#FF4AFF', // 粉色线条
  showLine: true, // 显示吸附线
  strokeWidth: 1, // 线条宽度
  dashPattern: [6, 2], // 虚线样式：6像素实线，2像素空白
  showLinePoints: true, // 显示吸附点标记
}

/**
 * 默认配置
 * 提供合理的默认值，确保吸附功能正常工作
 */
export const DEFAULT_CONFIG: Required<SnapConfig> = {
  parentContainer: null, // 父容器，null表示使用app.tree
  filter: () => true, // 默认不过滤任何元素
  viewportOnly: true, // 只对视口内元素进行吸附
  snapSize: 5, // 吸附范围5像素
  pointSize: 4, // 吸附点标记尺寸4像素
  lineColor: '#E03E1A', // 默认橙色线条
  showLine: true, // 默认显示吸附线
  strokeWidth: 1, // 默认线条宽度1像素
  dashPattern: null, // 默认实线
  showLinePoints: true, // 默认显示吸附点标记
}
