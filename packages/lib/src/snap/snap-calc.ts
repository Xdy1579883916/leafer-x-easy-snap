/**
 * Snap 吸附计算模块
 * 实现吸附点、吸附线的创建和碰撞检测算法
 */

import type { IUI } from '@leafer-ui/interface'
import type { BoundPoints, LineCollisionResult, Point, SnapLine, SnapPoint } from './types'

/**
 * 为元素创建吸附点
 * 将元素的8个边界点转换为吸附点对象
 * @param element 目标元素
 * @param getBoundPoints 获取边界点的函数
 * @returns 吸附点数组
 */
export function createSnapPoints(element: IUI, getBoundPoints: (el: IUI) => BoundPoints): SnapPoint[] {
  const snapPoints: SnapPoint[] = []
  const boundPoints: BoundPoints = getBoundPoints(element)
  Object.entries(boundPoints).forEach(([type, point]) => {
    snapPoints.push({
      x: point.x,
      y: point.y,
      type: type as SnapPoint['type'],
      element,
    })
  })
  return snapPoints
}

/**
 * 根据吸附点创建吸附线
 * 将相同坐标的吸附点分组，形成垂直和水平吸附线
 * @param snapPoints 吸附点数组
 * @returns 吸附线数组
 */
export function createSnapLines(snapPoints: SnapPoint[]): SnapLine[] {
  const verticalLines = new Map<number, SnapPoint[]>()
  const horizontalLines = new Map<number, SnapPoint[]>()
  const snapLines: SnapLine[] = []

  // 按坐标分组吸附点
  snapPoints.forEach((point) => {
    if (!verticalLines.has(point.x))
      verticalLines.set(point.x, [])
    verticalLines.get(point.x)!.push(point)
    if (!horizontalLines.has(point.y))
      horizontalLines.set(point.y, [])
    horizontalLines.get(point.y)!.push(point)
  })

  // 创建垂直吸附线（相同x坐标的点）
  verticalLines.forEach((points, x) => {
    if (points.length >= 1) {
      snapLines.push({
        type: 'vertical',
        value: x,
        points: points.sort((a, b) => a.y - b.y), // 按y坐标排序
      })
    }
  })
  // 创建水平吸附线（相同y坐标的点）
  horizontalLines.forEach((points, y) => {
    if (points.length >= 1) {
      snapLines.push({
        type: 'horizontal',
        value: y,
        points: points.sort((a, b) => a.x - b.x), // 按x坐标排序
      })
    }
  })
  return snapLines
}

/**
 * 检查目标点与吸附线的碰撞
 * 计算目标点是否在吸附线的吸附范围内
 * @param line 吸附线
 * @param targetPoints 目标点数组
 * @param axis 检测轴：'x' 或 'y'
 * @param isInSnapRange 判断是否在吸附范围的函数
 * @returns 碰撞检测结果，无碰撞时返回null
 */
export function checkLineCollision(
  line: SnapLine,
  targetPoints: Point[],
  axis: 'x' | 'y',
  isInSnapRange: (distance: number) => boolean,
): LineCollisionResult | null {
  const collisionPoints: SnapPoint[] = []
  const targetCollisionPoints: Point[] = []
  let minDistance = Infinity
  let offset = 0

  // 检查每个目标点是否与吸附线发生碰撞
  targetPoints.forEach((targetPoint) => {
    const distance = Math.abs(targetPoint[axis] - line.value)
    if (isInSnapRange(distance)) {
      // 记录最小距离和偏移量
      if (distance < minDistance) {
        minDistance = distance
        offset = targetPoint[axis] - line.value
      }
      targetCollisionPoints.push(targetPoint)
      collisionPoints.push(...line.points)
    }
  })
  if (collisionPoints.length === 0)
    return null

  // 去重碰撞点
  const uniqueCollisionPoints = collisionPoints.filter((point, index, arr) =>
    arr.findIndex(p => p.x === point.x && p.y === point.y) === index,
  )
  return {
    line,
    collisionPoints: uniqueCollisionPoints,
    targetPoints: targetCollisionPoints,
    offset,
    distance: minDistance,
  }
}

/**
 * 选择最佳碰撞结果
 * 从多个碰撞结果中选择距离最近的
 * @param results 碰撞结果数组
 * @returns 最佳碰撞结果，无结果时返回null
 */
export function selectBestLineCollision(results: LineCollisionResult[]): LineCollisionResult | null {
  if (!results.length)
    return null
  results.sort((a, b) => a.distance - b.distance)
  return results[0]
}

/**
 * 计算吸附结果
 * 检测目标元素与所有吸附线的碰撞情况
 * @param target 目标元素
 * @param snapLines 吸附线数组
 * @param getBoundPoints 获取边界点的函数
 * @param isInSnapRange 判断是否在吸附范围的函数
 * @returns X轴和Y轴的碰撞结果
 */
export function calculateSnap(
  target: IUI,
  snapLines: SnapLine[],
  getBoundPoints: (el: IUI) => BoundPoints,
  isInSnapRange: (distance: number) => boolean,
): { x: LineCollisionResult[], y: LineCollisionResult[] } {
  const targetPoints = getBoundPoints(target)
  const collisionResults = { x: [] as LineCollisionResult[], y: [] as LineCollisionResult[] }
  const targetSnapPoints = Object.values(targetPoints)

  // 检测与垂直线的碰撞（X方向吸附）
  snapLines.filter(line => line.type === 'vertical').forEach((line) => {
    const collisionResult = checkLineCollision(line, targetSnapPoints, 'x', isInSnapRange)
    if (collisionResult)
      collisionResults.x.push(collisionResult)
  })

  // 检测与水平线的碰撞（Y方向吸附）
  snapLines.filter(line => line.type === 'horizontal').forEach((line) => {
    const collisionResult = checkLineCollision(line, targetSnapPoints, 'y', isInSnapRange)
    if (collisionResult)
      collisionResults.y.push(collisionResult)
  })
  return collisionResults
}

/**
 * 过滤中点类型的吸附点
 * 在渲染吸附线时，避免显示过多的中点标记
 * @param axis 坐标轴：'x' 或 'y'
 * @param points 吸附点数组
 * @returns 过滤后的吸附点数组
 */
export function filterMidPoints(axis: string, points: SnapPoint[]): SnapPoint[] {
  return points.filter((v) => {
    if (axis === 'x')
      return !['ml', 'mr'].includes(v.type) // 过滤左右中点
    if (axis === 'y')
      return !['mt', 'mb'].includes(v.type) // 过滤上下中点
    return true
  })
}
