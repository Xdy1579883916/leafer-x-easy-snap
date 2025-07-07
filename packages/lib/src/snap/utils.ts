/**
 * Snap 工具函数模块
 * 提供吸附功能相关的通用工具函数
 */

import type { IUI } from '@leafer-ui/interface'
import type { BoundPoints, DistanceLabel, LineCollisionResult, Point } from './types'
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

/**
 * 计算两点之间的距离
 * @param point1 第一个点
 * @param point2 第二个点
 * @returns 两点间的欧几里得距离
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x
  const dy = point2.y - point1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 获取元素边界的中点坐标
 * @param element 目标元素
 * @param tree 树形结构根节点
 * @returns 元素边界的中点坐标
 */
export function getElementEdgeMidpoints(element: IUI, tree: IUI): {
  left: Point
  right: Point
  top: Point
  bottom: Point
} {
  const boundPoints = getElementBoundPoints(element, tree)
  return {
    left: boundPoints.ml, // 左中点
    right: boundPoints.mr, // 右中点
    top: boundPoints.mt, // 上中点
    bottom: boundPoints.mb, // 下中点
  }
}

/**
 * 计算距离标签信息
 * 找到与目标元素最近的吸附点，并计算标签线段和标签位置
 * @param target 目标元素
 * @param snapResults 吸附结果数组
 * @param tree 树形结构根节点
 * @param layerScale 图层缩放比例
 * @returns 距离标签信息数组
 */
export function calculateDistanceLabels(
  target: IUI,
  snapResults: { x: LineCollisionResult[], y: LineCollisionResult[] },
  tree: IUI,
  layerScale: number,
): DistanceLabel[] {
  const labels: DistanceLabel[] = []
  const targetEdgeMidpoints = getElementEdgeMidpoints(target, tree)

  // 处理X轴（垂直）吸附线
  if (snapResults.x.length > 0) {
    // 收集所有吸附点
    const allXPoints: Point[] = []
    snapResults.x.forEach((collision) => {
      allXPoints.push(...collision.collisionPoints)
    })
    const topMid = targetEdgeMidpoints.top
    const bottomMid = targetEdgeMidpoints.bottom
    let nearestTop: Point | null = null
    let nearestBottom: Point | null = null
    let minTopDist = Infinity
    let minBottomDist = Infinity
    for (const p of allXPoints) {
      const topDist = Math.abs(p.y - topMid.y)
      if (p.y < topMid.y && topDist < minTopDist) {
        minTopDist = topDist
        nearestTop = p
      }
      const bottomDist = Math.abs(p.y - bottomMid.y)
      if (p.y > bottomMid.y && bottomDist < minBottomDist) {
        minBottomDist = bottomDist
        nearestBottom = p
      }
    }
    let topLabel: DistanceLabel | null = null
    let bottomLabel: DistanceLabel | null = null
    if (nearestTop) {
      topLabel = createDistanceLabelWithLineByEdge(nearestTop, 'top', targetEdgeMidpoints, layerScale)
    }
    if (nearestBottom) {
      bottomLabel = createDistanceLabelWithLineByEdge(nearestBottom, 'bottom', targetEdgeMidpoints, layerScale)
    }

    if (topLabel && bottomLabel && topLabel.distance === bottomLabel.distance) {
      labels.push(topLabel, bottomLabel)
    }
    else if (topLabel && (!bottomLabel || topLabel.distance < bottomLabel.distance)) {
      labels.push(topLabel)
    }
    else if (bottomLabel) {
      labels.push(bottomLabel)
    }
  }

  // 处理Y轴（水平）吸附线
  if (snapResults.y.length > 0) {
    const allYPoints: Point[] = []
    snapResults.y.forEach((collision) => {
      allYPoints.push(...collision.collisionPoints)
    })
    const leftMid = targetEdgeMidpoints.left
    const rightMid = targetEdgeMidpoints.right
    let nearestLeft: Point | null = null
    let nearestRight: Point | null = null
    let minLeftDist = Infinity
    let minRightDist = Infinity
    for (const p of allYPoints) {
      const leftDist = Math.abs(p.x - leftMid.x)
      if (p.x < leftMid.x && leftDist < minLeftDist) {
        minLeftDist = leftDist
        nearestLeft = p
      }
      const rightDist = Math.abs(p.x - rightMid.x)
      if (p.x > rightMid.x && rightDist < minRightDist) {
        minRightDist = rightDist
        nearestRight = p
      }
    }
    let leftLabel: DistanceLabel | null = null
    let rightLabel: DistanceLabel | null = null
    if (nearestLeft) {
      leftLabel = createDistanceLabelWithLineByEdge(nearestLeft, 'left', targetEdgeMidpoints, layerScale)
    }
    if (nearestRight) {
      rightLabel = createDistanceLabelWithLineByEdge(nearestRight, 'right', targetEdgeMidpoints, layerScale)
    }
    if (leftLabel && rightLabel && leftLabel.distance === rightLabel.distance) {
      labels.push(leftLabel, rightLabel)
    }
    else if (leftLabel && (!rightLabel || leftLabel.distance < rightLabel.distance)) {
      labels.push(leftLabel)
    }
    else if (rightLabel) {
      labels.push(rightLabel)
    }
  }

  return labels
}

/**
 * 创建距离标签（指定边界和吸附点）
 */
function createDistanceLabelWithLineByEdge(
  snapPoint: Point,
  direction: 'left' | 'right' | 'top' | 'bottom',
  edgeMidpoints: { left: Point, right: Point, top: Point, bottom: Point },
  layerScale: number,
): DistanceLabel {
  const start = edgeMidpoints[direction]
  let end: Point
  if (direction === 'left' || direction === 'right') {
    end = { x: snapPoint.x, y: start.y }
  }
  else {
    end = { x: start.x, y: snapPoint.y }
  }
  const mid = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }
  const offset = 20 / layerScale
  let position = { ...mid }
  if (direction === 'left' || direction === 'right') {
    position = { x: mid.x, y: mid.y + offset }
  }
  else {
    position = { x: mid.x + offset, y: mid.y }
  }
  const distance
    = direction === 'left' || direction === 'right'
      ? Math.abs(start.x - end.x)
      : Math.abs(start.y - end.y)
  return {
    snapPoint,
    position,
    start,
    end,
    mid,
    distance: toFixed(distance, 0),
    direction,
    text: `${toFixed(distance, 0)}`,
  }
}
