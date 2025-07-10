/**
 * Snap 工具函数模块
 * 提供吸附功能相关的通用工具函数
 */

import type { IUI } from '@leafer-ui/interface'
import type { BoundPoints, DistanceLabel, EqualSpacingResult, LineCollisionResult, Point, SnapPoint } from './types'
import { Bounds } from '@leafer-ui/core'
import { filterMidPoints } from './snap-calc'

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
 * @returns 是否在吸附范围内
 */
export function isInSnapRange(distance: number, snapSize: number): boolean {
  return Math.round(distance) <= snapSize
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

  const minX = (Math.min(...xs))
  const maxX = (Math.max(...xs))
  const minY = (Math.min(...ys))
  const maxY = (Math.max(...ys))
  const centerX = ((minX + maxX) / 2)
  const centerY = ((minY + maxY) / 2)

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
 * @param tree
 * @returns 视口内可吸附元素列表
 */
export function getViewportElements(parentContainer: IUI, zoomLayer: any, tree: IUI): IUI[] {
  if (!zoomLayer) {
    return getAllElements(parentContainer)
  }
  const { x, y, width, height, scaleX, scaleY } = zoomLayer
  const vb = new Bounds(
    -x / scaleX,
    -y / scaleY,
    (-x + width) / scaleX,
    (-y + height) / scaleY,
  )
  return getAllElements(parentContainer).filter((element) => {
    const elementBounds = element.getLayoutBounds('box', tree)
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
 * 处理单个轴向的距离标签计算
 * @param collisionResults 碰撞结果数组
 * @param targetEdgeMidpoints 目标元素边界中点
 * @param axis 轴向类型
 * @param layerScale 图层缩放比例
 * @returns 该轴向的距离标签数组
 */
function processAxisDistanceLabels(
  collisionResults: LineCollisionResult[],
  targetEdgeMidpoints: { left: Point, right: Point, top: Point, bottom: Point },
  axis: 'x' | 'y',
  layerScale: number,
): DistanceLabel[] {
  if (collisionResults.length === 0)
    return []

  // 收集所有吸附点
  const allPoints: SnapPoint[] = []
  collisionResults.forEach((collision) => {
    allPoints.push(...filterMidPoints(axis, collision.collisionPoints))
  })

  // 根据轴向确定处理逻辑
  const isXAxis = axis === 'x'
  const [primaryMid, secondaryMid] = isXAxis
    ? [targetEdgeMidpoints.top, targetEdgeMidpoints.bottom]
    : [targetEdgeMidpoints.left, targetEdgeMidpoints.right]
  const [primaryDirection, secondaryDirection] = isXAxis
    ? ['top' as const, 'bottom' as const]
    : ['left' as const, 'right' as const]

  // 查找最近的吸附点
  let nearestPrimary: Point | null = null
  let nearestSecondary: Point | null = null
  let minPrimaryDist = Infinity
  let minSecondaryDist = Infinity

  for (const p of allPoints) {
    const coord = isXAxis ? p.y : p.x
    const primaryCoord = isXAxis ? primaryMid.y : primaryMid.x
    const secondaryCoord = isXAxis ? secondaryMid.y : secondaryMid.x

    const primaryDist = Math.abs(coord - primaryCoord)
    if (coord < primaryCoord && primaryDist < minPrimaryDist) {
      minPrimaryDist = primaryDist
      nearestPrimary = p
    }

    const secondaryDist = Math.abs(coord - secondaryCoord)
    if (coord > secondaryCoord && secondaryDist < minSecondaryDist) {
      minSecondaryDist = secondaryDist
      nearestSecondary = p
    }
  }

  // 创建标签
  let primaryLabel: DistanceLabel | null = null
  let secondaryLabel: DistanceLabel | null = null
  if (nearestPrimary) {
    primaryLabel = createDistanceLabelWithLineByEdge(nearestPrimary, primaryDirection, targetEdgeMidpoints, layerScale)
  }
  if (nearestSecondary) {
    secondaryLabel = createDistanceLabelWithLineByEdge(nearestSecondary, secondaryDirection, targetEdgeMidpoints, layerScale)
  }

  // 选择最优标签
  const labels: DistanceLabel[] = []
  if (primaryLabel && secondaryLabel && primaryLabel.distance === secondaryLabel.distance) {
    labels.push(primaryLabel, secondaryLabel)
  }
  else if (primaryLabel && (!secondaryLabel || primaryLabel.distance < secondaryLabel.distance)) {
    labels.push(primaryLabel)
  }
  else if (secondaryLabel) {
    labels.push(secondaryLabel)
  }

  return labels
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
  const targetEdgeMidpoints = getElementEdgeMidpoints(target, tree)
  return Object.entries(snapResults).map(([axis, results]) => {
    return processAxisDistanceLabels(
      results,
      targetEdgeMidpoints,
      axis as 'x' | 'y',
      layerScale,
    )
  }).flat()
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

/**
 * 计算目标元素为中心的连续等宽间距（X/Y轴扩散）
 * @param target 目标元素
 * @param snapElements 可吸附元素列表
 * @param tree 根节点
 * @returns 等宽间距结果数组（以目标为中心扩散）
 */
export function calculateEqualSpacing(
  target: IUI,
  snapElements: IUI[],
  tree: IUI,
): EqualSpacingResult[] {
  const results: EqualSpacingResult[] = []
  if (!target || !snapElements?.length)
    return results

  // 容错误差，允许的间距误差
  const tolerance = 1

  function findEqualSpacing(axis: 'x' | 'y'): void {
    const isX = axis === 'x'
    const getStart = (b: BoundPoints) => isX ? b.tl.x : b.tl.y
    const getEnd = (b: BoundPoints) => isX ? b.br.x : b.bl.y

    // 过滤和排序元素
    const filterFn = (el: IUI) => {
      const b = getElementBoundPoints(el, tree)
      const tBound = getElementBoundPoints(target, tree)
      const b1 = isX ? b.tl.y : b.tl.x
      const b2 = isX ? b.bl.y : b.br.x
      const t1 = isX ? tBound.tl.y : tBound.tl.x
      const t2 = isX ? tBound.bl.y : tBound.br.x
      return !(b2 <= t1 || b1 >= t2)
    }

    const group = [...snapElements, target]
      .filter(filterFn)
      .sort((a, b) => getStart(getElementBoundPoints(a, tree)) - getStart(getElementBoundPoints(b, tree)))

    const targetIdx = group.indexOf(target)
    if (targetIdx === -1) {
      return
    }

    // 收集所有间距
    const spacings: Array<{ start: number, end: number, spacing: number }> = []
    for (let i = 0; i < group.length - 1; i++) {
      const curr = getElementBoundPoints(group[i], tree)
      const next = getElementBoundPoints(group[i + 1], tree)
      const spacing = toFixed(getStart(next) - getEnd(curr))
      if (spacing > 0) {
        spacings.push({ start: i, end: i + 1, spacing })
      }
    }

    // 按间距值分组
    const spacingGroups = new Map<number, Array<{ start: number, end: number }>>()
    for (const { start, end, spacing } of spacings) {
      // 找到最接近的间距值
      let found = false
      for (const [existingSpacing] of spacingGroups) {
        if (Math.abs(spacing - existingSpacing) <= tolerance) {
          spacingGroups.get(existingSpacing)!.push({ start, end })
          found = true
          break
        }
      }
      if (!found) {
        spacingGroups.set(spacing, [{ start, end }])
      }
    }

    // 分析每个间距组
    for (const [spacing, positions] of spacingGroups) {
      if (positions.length < 2) {
        continue // 至少需要2个相同间距
      }

      // 检查是否包含目标元素相关的间距
      const hasTargetInvolved = positions.some(pos =>
        pos.start === targetIdx || pos.end === targetIdx,
      )

      if (!hasTargetInvolved) {
        continue
      }

      // 检查间距模式的有效性
      const isValidPattern = checkSpacingPattern(positions, targetIdx)

      if (isValidPattern) {
        // 生成等间距结果
        for (const { start, end } of positions) {
          const prev = group[start]
          const next = group[end]
          const prevBound = getElementBoundPoints(prev, tree)
          const nextBound = getElementBoundPoints(next, tree)

          // 交集区域
          const crossStart = Math.max(isX ? prevBound.tl.y : prevBound.tl.x, isX ? nextBound.tl.y : nextBound.tl.x)
          const crossEnd = Math.min(
            isX ? prevBound.bl.y : prevBound.br.x,
            isX ? nextBound.bl.y : nextBound.br.x,
          )

          results.push({
            axis,
            prevElement: prev,
            nextElement: next,
            prevSpacing: spacing,
            nextSpacing: spacing,
            equalSpacing: spacing,
            box: isX
              ? {
                  x: prevBound.br.x,
                  y: crossStart,
                  width: spacing,
                  height: crossEnd - crossStart,
                }
              : {
                  x: crossStart,
                  y: prevBound.bl.y,
                  width: crossEnd - crossStart,
                  height: spacing,
                },
            label: isX
              ? {
                  x: prevBound.br.x + spacing / 2,
                  y: crossStart + (crossEnd - crossStart) / 2,
                }
              : {
                  x: crossStart + (crossEnd - crossStart) / 2,
                  y: prevBound.bl.y + spacing / 2,
                },
          })
        }
      }
    }
  }

  // 检查间距模式是否有效
  function checkSpacingPattern(positions: Array<{ start: number, end: number }>, targetIdx: number): boolean {
    // 检查是否满足原有逻辑的要求
    const targetInvolved = positions.filter(pos => pos.start === targetIdx || pos.end === targetIdx)

    if (targetInvolved.length === 0) {
      return false
    }

    // 检查目标元素两侧的情况
    const leftPositions = positions.filter(pos => pos.end <= targetIdx)
    const rightPositions = positions.filter(pos => pos.start >= targetIdx)

    // 如果两侧都有间距，需要间距相等
    if (leftPositions.length > 0 && rightPositions.length > 0) {
      return true // 两侧都有等间距，直接有效
    }

    // 如果只有一侧有间距，需要至少2个等间距
    if (leftPositions.length >= 2 || rightPositions.length >= 2) {
      return true
    }

    return false
  }

  findEqualSpacing('x')
  findEqualSpacing('y')

  return results
}
