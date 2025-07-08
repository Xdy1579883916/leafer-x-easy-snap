/**
 * Snap 渲染模块
 * 负责吸附线和吸附点的可视化渲染
 */

import type { IUI } from '@leafer-ui/interface'
import type { DistanceLabel, Point, SnapConfig } from './types'
import { Box, Group, Line, Text } from '@leafer-ui/core'

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
    zIndex: 2,
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
    zIndex: 3,
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
 * 绘制距离线段
 * @param labels 距离标签信息数组
 * @param lineArray 距离线段元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawDistanceLines(labels: DistanceLabel[], lineArray: Line[], app: any, config: SnapConfig) {
  labels.forEach((label, index) => {
    let line = lineArray[index]
    if (!line) {
      line = new Line({
        stroke: config.lineColor,
        strokeWidth: config.strokeWidth,
        ...(config?.distanceLabelStyle?.line || {}),
        className: 'distance-line',
        visible: false,
        zIndex: 1,
      })
      lineArray.push(line)
      app.sky?.add(line)
    }
    // 转换为世界坐标
    const start = app.tree?.getWorldPoint(label.start)
    const end = app.tree?.getWorldPoint(label.end)
    if (start && end) {
      line.set({
        points: [start.x, start.y, end.x, end.y],
        visible: true,
      })
    }
  })
}

/**
 * 绘制距离标签
 * 在距离线段中点显示标签
 * @param labels 距离标签信息数组
 * @param labelGroups 标签元素缓存数组
 * @param app Leafer应用实例
 * @param config 吸附配置
 */
export function drawDistanceLabels(labels: DistanceLabel[], labelGroups: Box[], app: any, config: SnapConfig) {
  labels.forEach((label, index) => {
    let labelGroup = labelGroups[index]
    if (!labelGroup) {
      labelGroup = createDistanceLabel(config)
      labelGroups.push(labelGroup)
      app.sky?.add(labelGroup)
    }
    updateDistanceLabel(labelGroup, label, app)
  })
}

/**
 * 创建距离标签元素
 * 创建包含背景和文本的标签组
 * @param config 吸附配置
 * @returns 包含背景和文本的Group元素
 */
export function createDistanceLabel(config: SnapConfig): Box {
  return new Box({
    ...(config.distanceLabelStyle?.box),
    className: 'distance-label',
    children: [
      new Text({
        ...(config.distanceLabelStyle?.text),
        className: 'distance-label-text',
        visible: true,
      }),
    ],
    zIndex: 3,
    visible: true,
  })
}

/**
 * 更新距离标签的位置和内容
 * 将本地坐标转换为世界坐标并更新标签
 * @param labelBox 要更新的标签组
 * @param label 标签信息
 * @param app Leafer应用实例
 */
export function updateDistanceLabel(labelBox: Box, label: DistanceLabel, app: any) {
  const worldPoint = app.tree?.getWorldPoint(label.position)
  if (worldPoint) {
    const text = labelBox.children[0] as Text
    text.set({
      text: label.text,
      visible: true,
    })
    labelBox.set({
      visible: true,
      x: worldPoint.x,
      y: worldPoint.y,
    })
  }
}

/**
 * 销毁元素
 */
export function destroyRenderElements(uis: IUI[]) {
  uis.forEach(ui => ui.destroy())
}

/**
 * 隐藏元素
 */
export function hideRenderElements(uis: IUI[]) {
  uis.forEach(ui => ui.visible = 0)
}
