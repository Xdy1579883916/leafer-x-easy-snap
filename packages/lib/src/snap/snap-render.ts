/**
 * Snap 渲染模块
 * 负责吸附线和吸附点的可视化渲染
 */

import type { Point, SnapConfig } from './types'
import { Group, Line } from '@leafer-ui/core'

/**
 * 绘制吸附线
 * 根据线条数据创建或更新吸附线元素
 * @param lines 线条坐标数组，每个元素为 [x1, y1, x2, y2]
 * @param direction 线条方向：'vertical' 或 'horizontal'
 * @param lineArray 线条元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawLines(lines: number[][], direction: 'vertical' | 'horizontal', lineArray: Line[], app: any, config: SnapConfig) {
  lines.forEach((linePoints, index) => {
    let line = lineArray[index]
    if (!line) {
      line = createSnapLine(direction, config)
      lineArray.push(line)
      app.sky?.add(line)
    }
    updateSnapLine(line, linePoints, app, config)
  })
}

/**
 * 创建吸附线元素
 * @param direction 线条方向
 * @param config 吸附配置
 * @returns 新创建的Line元素
 */
export function createSnapLine(direction: 'vertical' | 'horizontal', config: SnapConfig): Line {
  return new Line({
    stroke: config.lineColor,
    strokeWidth: config.strokeWidth,
    className: `snap-line-${direction}`,
    visible: false,
    dashPattern: config.dashPattern,
  })
}

/**
 * 更新吸附线的位置和样式
 * 将本地坐标转换为世界坐标并更新线条
 * @param line 要更新的线条元素
 * @param points 线条端点坐标 [x1, y1, x2, y2]
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function updateSnapLine(line: Line, points: number[], app: any, config: SnapConfig) {
  const [x1, y1, x2, y2] = points
  const worldPoint1 = app.tree?.getWorldPoint({ x: x1, y: y1 })
  const worldPoint2 = app.tree?.getWorldPoint({ x: x2, y: y2 })
  if (worldPoint1 && worldPoint2) {
    line.set({
      points: [worldPoint1.x, worldPoint1.y, worldPoint2.x, worldPoint2.y],
      visible: true,
      stroke: config.lineColor,
      strokeWidth: config.strokeWidth,
      dashPattern: config.dashPattern,
    })
  }
}

/**
 * 绘制吸附点标记
 * 在碰撞点位置显示十字形标记
 * @param points 要标记的点坐标数组
 * @param pointGroups 点标记元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawSnapPoints(points: Point[], pointGroups: Group[], app: any, config: SnapConfig) {
  // 去重处理，避免重复标记
  const uniquePoints = points.filter((point, index, arr) =>
    arr.findIndex(p => Math.abs(p.x - point.x) < 1 && Math.abs(p.y - point.y) < 1) === index,
  )
  uniquePoints.forEach((point, index) => {
    let pointGroup = pointGroups[index]
    if (!pointGroup) {
      pointGroup = createSnapPoint(config)
      pointGroups.push(pointGroup)
      app.sky?.add(pointGroup)
    }
    updateSnapPoint(pointGroup, point, app)
  })
}

/**
 * 创建吸附点标记元素
 * 创建十字形的点标记
 * @param config 吸附配置
 * @returns 包含两条交叉线的Group元素
 */
export function createSnapPoint(config: SnapConfig): Group {
  const { lineColor, pointSize, strokeWidth } = config
  const line1 = new Line({
    stroke: lineColor,
    strokeWidth,
    points: [0, 0, pointSize, pointSize], // 左上到右下的对角线
    className: 'snap-point-line',
  })
  const line2 = new Line({
    stroke: lineColor,
    strokeWidth,
    points: [0, pointSize, pointSize, 0], // 左下到右上的对角线
    className: 'snap-point-line',
  })
  return new Group({
    className: 'snap-point',
    children: [line1, line2],
    around: 'center', // 以中心点为基准
    visible: false,
  })
}

/**
 * 更新吸附点标记的位置
 * 将本地坐标转换为世界坐标并更新标记位置
 * @param pointGroup 要更新的点标记组
 * @param point 目标坐标
 * @param app Leafer应用实例
 */
export function updateSnapPoint(pointGroup: Group, point: Point, app: any) {
  const worldPoint = app.tree?.getWorldPoint(point)
  if (worldPoint) {
    pointGroup.set({
      visible: true,
      x: worldPoint.x,
      y: worldPoint.y,
    })
  }
}

/**
 * 清除所有吸附线
 * 隐藏所有垂直和水平吸附线
 * @param verticalLines 垂直线数组
 * @param horizontalLines 水平线数组
 */
export function clearSnapLines(verticalLines: Line[], horizontalLines: Line[]) {
  [...verticalLines, ...horizontalLines].forEach((line) => {
    line.visible = false
  })
}

/**
 * 清除所有吸附点标记
 * 隐藏所有吸附点标记
 * @param verticalLinePoints 垂直吸附点数组
 * @param horizontalLinePoints 水平吸附点数组
 */
export function clearSnapPoints(verticalLinePoints: Group[], horizontalLinePoints: Group[]) {
  [...verticalLinePoints, ...horizontalLinePoints].forEach((point) => {
    point.visible = false
  })
}

/**
 * 销毁所有渲染元素
 * 清理吸附线和吸附点标记，释放内存
 * @param verticalLines 垂直线数组
 * @param horizontalLines 水平线数组
 * @param verticalLinePoints 垂直吸附点数组
 * @param horizontalLinePoints 水平吸附点数组
 */
export function destroyRenderElements(verticalLines: Line[], horizontalLines: Line[], verticalLinePoints: Group[], horizontalLinePoints: Group[]) {
  // 销毁吸附线
  ;[...verticalLines, ...horizontalLines].forEach((line) => {
    line.destroy()
  })
  // 销毁吸附点标记
  ;[...verticalLinePoints, ...horizontalLinePoints].forEach((point) => {
    point.destroy()
  })
  // 清空数组引用
  verticalLines.length = 0
  horizontalLines.length = 0
  verticalLinePoints.length = 0
  horizontalLinePoints.length = 0
}
