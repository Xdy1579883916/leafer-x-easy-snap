/**
 * Snap 工具函数模块
 * 提供吸附功能相关的通用工具函数
 */

import type { IUI } from '@leafer-ui/interface'
import type { BoundPoints } from './types'
import { Bounds } from '@leafer-ui/core'

/**
 * 数值精度处理函数
 * @param v 要处理的数值或字符串
 * @param digits 保留的小数位数，默认为0
 * @returns 处理后的数值
 */
export function toFixed(v: number | string, digits = 0): number {
  const multiplier = 10 ** digits
  return Math.round(Number(v) * multiplier) / multiplier
}

/**
 * 判断距离是否在吸附范围内
 * @param distance 距离值
 * @param snapSize 吸附范围大小
 * @param layerScale 图层缩放比例
 * @returns 是否在吸附范围内
 */
export function isInSnapRange(distance: number, snapSize: number, layerScale: number): boolean {
  const snapThreshold = snapSize / layerScale
  return distance <= snapThreshold
}

/**
 * 获取元素的边界点坐标
 * 计算元素的8个关键点：四个角点和四个中点
 * @param element 目标元素
 * @param tree 树形结构根节点
 * @returns 边界点映射对象
 */
export function getElementBoundPoints(element: IUI, tree: IUI): BoundPoints {
  const points = element.getLayoutPoints('box', tree)
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)

  const minX = toFixed(Math.min(...xs))
  const maxX = toFixed(Math.max(...xs))
  const minY = toFixed(Math.min(...ys))
  const maxY = toFixed(Math.max(...ys))
  const centerX = toFixed((minX + maxX) / 2)
  const centerY = toFixed((minY + maxY) / 2)

  return {
    tl: { x: minX, y: minY }, // 左上角
    tr: { x: maxX, y: minY }, // 右上角
    bl: { x: minX, y: maxY }, // 左下角
    br: { x: maxX, y: maxY }, // 右下角
    ml: { x: minX, y: centerY }, // 左中点
    mr: { x: maxX, y: centerY }, // 右中点
    mt: { x: centerX, y: minY }, // 上中点
    mb: { x: centerX, y: maxY }, // 下中点
  }
}

/**
 * 获取所有可吸附的元素
 * 包括父容器及其所有子元素
 * @param parentContainer 父容器元素
 * @returns 可吸附元素列表
 */
export function getAllElements(parentContainer: IUI): IUI[] {
  const list = [
    parentContainer,
    ...(parentContainer?.children || []),
  ]
  return list.filter(isValidElement) || []
}

/**
 * 获取视口内的可吸附元素
 * 只返回当前视口范围内可见的元素，提高性能
 * @param parentContainer 父容器元素
 * @param zoomLayer 缩放图层信息
 * @returns 视口内可吸附元素列表
 */
export function getViewportElements(parentContainer: IUI, zoomLayer: any): IUI[] {
  if (!zoomLayer) {
    return getAllElements(parentContainer)
  }
  const vb = new Bounds(
    zoomLayer.x,
    zoomLayer.y,
    -zoomLayer.x + zoomLayer.width / zoomLayer.scaleX,
    -zoomLayer.y + zoomLayer.height / zoomLayer.scaleY,
  )
  return getAllElements(parentContainer).filter((element) => {
    const elementBounds = element.getLayoutBounds('box', 'world')
    return vb.hit(elementBounds)
  })
}

/**
 * 检查元素是否有效（可用于吸附）
 * 排除 Leafer 内部元素和模拟元素
 * @param element 要检查的元素
 * @returns 是否为有效元素
 */
export function isValidElement(element: IUI): boolean {
  return (!element.isLeafer && element.tag !== 'SimulateElement')
}
