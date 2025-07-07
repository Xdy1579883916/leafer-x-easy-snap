/**
 * Snap 模块类型定义
 * 定义了吸附功能相关的所有接口和类型
 */

import type { IUI } from '@leafer-ui/interface'

/**
 * 基础点坐标接口
 */
export interface Point {
  x: number
  y: number
}

/**
 * 吸附点接口
 * 表示元素边界上的可吸附点，包含位置、类型和所属元素信息
 */
export interface SnapPoint extends Point {
  /** 吸附点类型：tl(左上)、tr(右上)、bl(左下)、br(右下)、ml(左中)、mr(右中)、mt(上中)、mb(下中) */
  type: 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'
  /** 所属的UI元素 */
  element: IUI
}

/**
 * 吸附线接口
 * 表示由相同坐标的吸附点组成的垂直或水平吸附线
 */
export interface SnapLine {
  /** 线条类型：垂直或水平 */
  type: 'vertical' | 'horizontal'
  /** 线条的坐标值：垂直线为x坐标，水平线为y坐标 */
  value: number
  /** 在此线上的所有吸附点 */
  points: SnapPoint[]
}

/**
 * 线碰撞检测结果接口
 * 记录目标元素与吸附线的碰撞信息
 */
export interface LineCollisionResult {
  /** 发生碰撞的吸附线 */
  line: SnapLine
  /** 发生碰撞的吸附点列表 */
  collisionPoints: SnapPoint[]
  /** 目标元素上的碰撞点列表 */
  targetPoints: Point[]
  /** 偏移量：目标点坐标 - 吸附线坐标 */
  offset: number
  /** 碰撞距离 */
  distance: number
}

/**
 * 元素边界点映射类型
 * 将吸附点类型映射到对应的坐标点
 */
export type BoundPoints = Record<SnapPoint['type'], Point>

/**
 * Snap 配置接口
 * 定义吸附功能的各种配置选项
 */
export interface SnapConfig {
  /** 基于哪个容器计算吸附元素，默认为 app.tree */
  parentContainer?: IUI
  /** 是否只对视口内元素进行吸附，默认为 true */
  viewportOnly?: boolean
  /** 自定义过滤规则，用于排除特定元素 */
  filter?: (element: IUI) => boolean
  /** 是否显示吸附线，默认为 true */
  showLine?: boolean
  /** 是否显示吸附点标记，默认为 true */
  showLinePoints?: boolean
  /** 吸附范围（像素），默认为 5 */
  snapSize?: number
  /** 吸附线颜色，默认为 '#E03E1A' */
  lineColor?: string
  /** 吸附点标记尺寸，默认为 4 */
  pointSize?: number
  /** 吸附线宽度，默认为 1 */
  strokeWidth?: number
  /** 吸附线虚线样式，默认为 null（实线） */
  dashPattern?: number[]
}
