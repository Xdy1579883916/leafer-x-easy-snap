import type { EditorEvent } from '@leafer-in/editor'
import type { ISimulateElement } from '@leafer-in/interface'
import type { IAnswer, IApp, IUI } from '@leafer-ui/interface'
import { EditorMoveEvent } from '@leafer-in/editor'
import { Bounds, dataType, Group, KeyEvent, LayoutEvent, Line, PointerEvent, UI } from '@leafer-ui/core'

// 扩展UI元素属性
UI.addAttr('isSnap', true, dataType)

declare module '@leafer-ui/interface' {
  interface ILeafAttrData {
    isSnap?: boolean
  }
}

// 基础点
interface Point {
  x: number
  y: number
}

// 吸附点
interface SnapPoint extends Point {
  // 点类型
  type: 'tl' |
    'tr' |
    'bl' |
    'br' |
    'ml' |
    'mr' |
    'mt' |
    'mb'
  element: IUI
}

// 吸附线
interface SnapLine {
  type: 'vertical' | 'horizontal'
  value: number // x坐标（垂直线）或y坐标（水平线）
  points: SnapPoint[] // 在此线上的所有吸附点
}

// 线碰撞结果
interface LineCollisionResult {
  line: SnapLine
  collisionPoints: SnapPoint[] // 发生碰撞的点
  targetPoints: Point[] // 目标元素上的碰撞点
  offset: number
  distance: number
}

type BoundPoints = Record<SnapPoint['type'], Point>

// 配置接口
export interface SnapConfig {
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

// 一些主题
export const theme_1: SnapConfig = {
  lineColor: '#FF4AFF',
  showLine: true,
  strokeWidth: 1,
  dashPattern: [6, 2],
  showLinePoints: true,
}

// 默认配置
const DEFAULT_CONFIG: Required<SnapConfig> = {
  parentContainer: null,
  filter: () => true,
  viewportOnly: true,
  snapSize: 5,
  pointSize: 4,
  lineColor: '#E03E1A',
  showLine: true,
  strokeWidth: 1,
  dashPattern: null,
  showLinePoints: true,
}

function toFixed(v: number | string, digits = 0): number {
  const multiplier = 10 ** digits
  return Math.round(Number(v) * multiplier) / multiplier
}

export class Snap {
  private readonly app: IApp
  private config: Required<SnapConfig>

  // 吸附相关状态
  private snapPoints: SnapPoint[] = []
  private snapLines: SnapLine[] = []
  private isSnapping = false
  private isKeyEvent = false
  private isEnabled = false

  // 渲染元素缓存
  private verticalLines: Line[] = []
  private horizontalLines: Line[] = []
  private verticalLinePoints: Group[] = []
  private horizontalLinePoints: Group[] = []

  constructor(app: IApp, config?: SnapConfig) {
    // 参数验证
    if (!app?.isApp) {
      throw new Error('参数必须是有效的 App 实例')
    }
    if (!app.tree) {
      throw new Error('App 必须包含 tree 层')
    }
    if (!app.editor) {
      throw new Error('App 必须包含 editor')
    }

    this.app = app
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 绑定事件处理器
    this.bindEventHandlers()
  }

  get parentContainer() {
    return this.config.parentContainer || this.app.tree
  }

  get layerScale() {
    return this.app.zoomLayer?.scaleX || 1
  }

  /**
   * 绑定事件处理器
   */
  private bindEventHandlers(): void {
    this.handleBeforeMove = this.handleBeforeMove.bind(this)
    this.handleMove = this.handleMove.bind(this)
    this.clear = this.clear.bind(this)
    this.handleKeyEvent = this.handleKeyEvent.bind(this)
  }

  /**
   * 启用/禁用吸附功能
   */
  public enable(enabled: boolean): void {
    if (this.isEnabled === enabled)
      return

    this.isEnabled = enabled

    if (enabled) {
      this.attachEvents()
    }
    else {
      this.detachEvents()
      this.clear()
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.detachEvents()
    this.destroyRenderElements()
  }

  // ==================== 事件处理 ====================

  private attachEvents(): void {
    const { editor } = this.app
    editor?.on(EditorMoveEvent.BEFORE_MOVE, this.handleBeforeMove)
    editor?.on(EditorMoveEvent.MOVE, this.handleMove)
    this.app.on(PointerEvent.UP, this.clear)
    this.app.tree?.on(LayoutEvent.AFTER, this.clear)
    this.app.on([KeyEvent.DOWN, KeyEvent.UP], this.handleKeyEvent, { capture: true })
  }

  private detachEvents(): void {
    const { editor } = this.app
    editor?.off(EditorMoveEvent.BEFORE_MOVE, this.handleBeforeMove)
    editor?.off(EditorMoveEvent.MOVE, this.handleMove)
    this.app.off(PointerEvent.UP, this.clear)
    this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    this.app.off([KeyEvent.DOWN, KeyEvent.UP], this.handleKeyEvent, { capture: true })
  }

  private handleBeforeMove(_e: EditorEvent): void {
    if (!this.isEnabled)
      return

    // 收集可吸附的元素
    const snapElements = this.collectSnapElements()
    this.snapPoints = snapElements.map(el => this.createSnapPoints(el)).flat()
    this.snapLines = this.createSnapLines(this.snapPoints)
    // 重置吸附状态
    this.isSnapping = false
  }

  private handleMove(event: EditorMoveEvent): void {
    if (!this.isEnabled)
      return

    const { target, moveX, moveY } = event
    if (!moveX && !moveY)
      return

    // 清除之前的吸附线
    if (!this.isSnapping) {
      this.clearSnapLines()
    }

    // 计算吸附结果
    const snapResult = this.calculateSnap(target)

    // 应用吸附偏移
    this.applySnapOffset(target, {
      x: this.selectBestLineCollision(snapResult.x),
      y: this.selectBestLineCollision(snapResult.y),
    })

    // 绘制吸附线和标签
    if (this.config.showLine && (snapResult.x || snapResult.y)) {
      this.renderSnapLines(target, snapResult)
      this.isSnapping = true
    }
  }

  private handleKeyEvent(e: KeyEvent): void {
    const arrowKeys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']

    if (arrowKeys.includes(e.code)) {
      this.isKeyEvent = e.type === KeyEvent.DOWN
    }
  }

  private clear(): void {
    if (!this.isEnabled)
      return
    this.clearSnapLines()
    this.clearSnapPoints()
    this.isSnapping = false
  }

  // ==================== 核心算法 ====================

  /**
   * 收集可吸附的元素
   */
  private collectSnapElements(): IUI[] {
    const selectedElements = this.app.editor?.list || []
    const allElements = this.config.viewportOnly ? this.getViewportElements() : this.getAllElements()

    return allElements
      .filter((element) => {
        // 排除选中的元素
        if (selectedElements.includes(element))
          return false

        // 排除不启用吸附的元素
        if (!element.isSnap)
          return false

        // 应用自定义过滤器
        return this.config.filter(element)
      })
  }

  /**
   * 构建吸附点和吸附线
   */
  private createSnapPoints(element: IUI): SnapPoint[] {
    const snapPoints: SnapPoint[] = []
    const boundPoints: BoundPoints = this.getElementBoundPoints(element)
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
   * 根据吸附点 构建吸附线：横3竖3的线结构
   */
  private createSnapLines(snapPoints: SnapPoint[]): SnapLine[] {
    const verticalLines = new Map<number, SnapPoint[]>()
    const horizontalLines = new Map<number, SnapPoint[]>()
    const snapLines: SnapLine[] = []

    // 按坐标分组吸附点
    snapPoints.forEach((point) => {
      // 垂直线（相同x坐标）
      if (!verticalLines.has(point.x)) {
        verticalLines.set(point.x, [])
      }
      verticalLines.get(point.x)!.push(point)

      // 水平线（相同y坐标）
      if (!horizontalLines.has(point.y)) {
        horizontalLines.set(point.y, [])
      }
      horizontalLines.get(point.y)!.push(point)
    })

    // 创建垂直吸附线
    verticalLines.forEach((points, x) => {
      if (points.length >= 1) {
        snapLines.push({
          type: 'vertical',
          value: x,
          points: points.sort((a, b) => a.y - b.y), // 按y坐标排序
        })
      }
    })

    // 创建水平吸附线
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
   * 计算吸附结果：基于线碰撞检测
   */
  private calculateSnap(target: IUI): { x: LineCollisionResult[], y: LineCollisionResult[] } {
    // 获取目标元素的边界点
    const targetPoints = this.getElementBoundPoints(target)
    const collisionResults = { x: [] as LineCollisionResult[], y: [] as LineCollisionResult[] }

    // 获取目标元素的8个点（排除中心点）
    const targetSnapPoints = Object.values(targetPoints)

    // 检测与垂直线的碰撞（X方向吸附）
    this.snapLines
      .filter(line => line.type === 'vertical')
      .forEach((line) => {
        const collisionResult = this.checkLineCollision(line, targetSnapPoints, 'x')
        if (collisionResult) {
          collisionResults.x.push(collisionResult)
        }
      })

    // 检测与水平线的碰撞（Y方向吸附）
    this.snapLines
      .filter(line => line.type === 'horizontal')
      .forEach((line) => {
        const collisionResult = this.checkLineCollision(line, targetSnapPoints, 'y')
        if (collisionResult) {
          collisionResults.y.push(collisionResult)
        }
      })

    // 选择最佳碰撞结果
    return collisionResults
  }

  /**
   * 检查线碰撞
   */
  private checkLineCollision(
    line: SnapLine,
    targetPoints: Point[],
    axis: 'x' | 'y',
  ): LineCollisionResult | null {
    const collisionPoints: SnapPoint[] = []
    const targetCollisionPoints: Point[] = []
    let minDistance = Infinity
    let offset = 0

    // 检查目标点是否与线发生碰撞
    targetPoints.forEach((targetPoint) => {
      const distance = Math.abs(targetPoint[axis] - line.value)

      if (this.isInSnapRange(distance)) {
        // 发生碰撞，记录所有在此线上的点
        if (distance < minDistance) {
          minDistance = distance
          offset = targetPoint[axis] - line.value
        }

        targetCollisionPoints.push(targetPoint)
        // 将线上的所有点都标记为碰撞点
        collisionPoints.push(...line.points)
      }
    })

    if (collisionPoints.length === 0) {
      return null
    }

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
   * 选择最佳线碰撞结果
   */
  private selectBestLineCollision(results: LineCollisionResult[]): LineCollisionResult | null {
    if (!results.length) {
      return null
    }

    // 按距离排序，选择最近的
    results.sort((a, b) => a.distance - b.distance)
    return results[0]
  }

  /**
   * 应用吸附偏移
   */
  private applySnapOffset(target: IUI, snapResult: { x: LineCollisionResult | null, y: LineCollisionResult | null }): void {
    if (this.isKeyEvent) {
      return
    }
    Object.entries(snapResult).forEach(([axis, snap]) => {
      snap && this.applyOffset(target, axis as 'x' | 'y', snap.offset)
    })
  }

  /**
   * 应用单轴偏移
   */
  private applyOffset(target: IUI, axis: 'x' | 'y', offset: number): void {
    const editor = this.app.editor

    editor.list.forEach((element) => {
      element[axis] = toFixed(element[axis] - offset)
    })
    if (editor.multiple) {
      // 安全更新目标元素
      (target as ISimulateElement).safeChange?.(() => {
        target[axis] = toFixed(target[axis] - offset)
      })
    }
  }

  // ==================== 渲染方法 ====================

  /**
   * 渲染吸附线：基于线碰撞结果
   */
  private renderSnapLines(target: IUI, snapResult: { x: LineCollisionResult[], y: LineCollisionResult[] }): void {
    const linesToDraw: { vertical: number[][], horizontal: number[][] } = {
      vertical: [],
      horizontal: [],
    }
    const allCollisionPoints: Point[] = []

    const targetSnapPoints = this.createSnapPoints(target)
    const targetSnapLines = this.createSnapLines(targetSnapPoints)

    // 获取选中元素的当前边界点（吸附后的坐标）
    Object.entries(snapResult).forEach(([axis, results]) => {
      results.forEach((result) => {
        const { line, collisionPoints } = result
        const sameTypeLines = targetSnapLines.filter((v) => {
          return v.type === line.type && v.value === line.value
        })

        // 只有当目标元素的边与吸附线重合时才渲染
        if (sameTypeLines.length > 0) {
          // console.log('sameTypeLines', sameTypeLines, collisionPoints)
          // 收集所有相关点（碰撞点 + 对齐的目标点）
          const allPoints = this.filterMidPoints(axis, [
            ...collisionPoints,
            ...sameTypeLines.map(v => v.points).flat(),
          ])

          // 取长度
          const invertedAxis = axis === 'x' ? 'y' : 'x'

          // 按最低点到最高点连线
          if (allPoints.length > 0) {
            const min = Math.min(...allPoints.map((p: any) => p[invertedAxis]))
            const max = Math.max(...allPoints.map((p: any) => p[invertedAxis]))
            if (axis === 'x') {
              linesToDraw.vertical.push([line.value, min, line.value, max])
            }
            else {
              linesToDraw.horizontal.push([min, line.value, max, line.value])
            }

            // 记录所有碰撞点用于标记
            allCollisionPoints.push(...allPoints)
          }
        }
      })
    })

    // 绘制线条
    this.drawLines(linesToDraw.vertical, 'vertical')
    this.drawLines(linesToDraw.horizontal, 'horizontal')

    // 绘制吸附点：在线上标记所有碰撞点位置
    if (this.config.showLinePoints) {
      this.drawSnapPoints(allCollisionPoints)
    }
  }

  // 绘制吸附点时过滤边的中点，避免点过多
  private filterMidPoints(axis: string, points: SnapPoint[]): SnapPoint[] {
    return points.filter((v) => {
      if (axis === 'x') {
        return !['ml', 'mr'].includes(v.type)
      }
      else if (axis === 'y') {
        return !['mt', 'mb'].includes(v.type)
      }
      return true
    })
  }

  /**
   * 绘制线条
   */
  private drawLines(lines: number[][], direction: 'vertical' | 'horizontal'): void {
    const lineArray = direction === 'vertical' ? this.verticalLines : this.horizontalLines

    lines.forEach((linePoints, index) => {
      let line = lineArray[index]

      if (!line) {
        line = this.createSnapLine(direction)
        lineArray.push(line)
        this.app.sky?.add(line)
      }

      this.updateSnapLine(line, linePoints)
    })
  }

  /**
   * 创建吸附线
   */
  private createSnapLine(direction: 'vertical' | 'horizontal'): Line {
    return new Line({
      stroke: this.config.lineColor,
      strokeWidth: this.config.strokeWidth,
      className: `snap-line-${direction}`,
      visible: false,
      dashPattern: this.config.dashPattern,
    })
  }

  /**
   * 更新吸附线
   */
  private updateSnapLine(line: Line, points: number[]): void {
    const [x1, y1, x2, y2] = points

    const worldPoint1 = this.app.tree?.getWorldPoint({ x: x1, y: y1 })
    const worldPoint2 = this.app.tree?.getWorldPoint({ x: x2, y: y2 })

    if (worldPoint1 && worldPoint2) {
      line.set({
        points: [worldPoint1.x, worldPoint1.y, worldPoint2.x, worldPoint2.y],
        visible: true,
        stroke: this.config.lineColor,
        strokeWidth: this.config.strokeWidth,
        dashPattern: this.config.dashPattern,
      })
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 判断是否在吸附范围内
   */
  private isInSnapRange(distance: number): boolean {
    const snapThreshold = this.config.snapSize / this.layerScale
    return distance <= snapThreshold
  }

  /**
   * 获取元素的边界点
   */
  private getElementBoundPoints(element: IUI): BoundPoints {
    const points = element.getLayoutPoints('box', this.app.tree)
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)

    const minX = toFixed(Math.min(...xs))
    const maxX = toFixed(Math.max(...xs))
    const minY = toFixed(Math.min(...ys))
    const maxY = toFixed(Math.max(...ys))
    const centerX = toFixed((minX + maxX) / 2)
    const centerY = toFixed((minY + maxY) / 2)

    return {
      tl: { x: minX, y: minY }, // 左上
      tr: { x: maxX, y: minY }, // 右上
      bl: { x: minX, y: maxY }, // 左下
      br: { x: maxX, y: maxY }, // 右下
      // c: { x: centerX, y: centerY }, // 中心
      ml: { x: minX, y: centerY }, // 左中
      mr: { x: maxX, y: centerY }, // 右中
      mt: { x: centerX, y: minY }, // 上中
      mb: { x: centerX, y: maxY }, // 下中
    }
  }

  /**
   * 获取子级元素
   */
  private getAllElements(): IUI[] {
    const child = this.parentContainer?.children?.filter(this.isValidElement) || []
    return [this.parentContainer, ...child]
  }

  /**
   * 获取视口内的元素
   */
  private getViewportElements(): IUI[] {
    const zoomLayer = this.app.zoomLayer
    if (!zoomLayer)
      return this.getAllElements()
    const layerBounds = zoomLayer.getLayoutBounds('box', this.app.tree)
    const vb = new Bounds(layerBounds)
    return this.getAllElements().filter((element) => {
      const elementBounds = element.getLayoutBounds('box', this.app.tree)
      return vb.hit(elementBounds)
    })
  }

  /**
   * 检查元素是否有效
   */
  private isValidElement = (element: IUI): IAnswer => {
    return (!element.isLeafer && element.tag !== 'SimulateElement') ? 1 : 0
  }

  /**
   * 清除吸附线
   */
  private clearSnapLines(): void {
    [...this.verticalLines, ...this.horizontalLines].forEach((line) => {
      line.visible = false
    })
  }

  /**
   * 绘制吸附点
   */
  private drawSnapPoints(points: Point[]): void {
    // 去重
    const uniquePoints = points.filter((point, index, arr) =>
      arr.findIndex(p => Math.abs(p.x - point.x) < 1 && Math.abs(p.y - point.y) < 1) === index,
    )

    uniquePoints.forEach((point, index) => {
      let pointGroup = this.verticalLinePoints[index]

      if (!pointGroup) {
        pointGroup = this.createSnapPoint()
        this.verticalLinePoints.push(pointGroup)
        this.app.sky?.add(pointGroup)
      }

      this.updateSnapPoint(pointGroup, point)
    })
  }

  /**
   * 创建吸附点
   */
  private createSnapPoint(): Group {
    const { lineColor, pointSize, strokeWidth } = this.config
    const line1 = new Line({
      stroke: lineColor,
      strokeWidth,
      points: [0, 0, pointSize, pointSize],
      className: 'snap-point-line',
    })

    const line2 = new Line({
      stroke: lineColor,
      strokeWidth,
      points: [0, pointSize, pointSize, 0],
      className: 'snap-point-line',
    })

    return new Group({
      className: 'snap-point',
      children: [line1, line2],
      around: 'center',
      visible: false,
    })
  }

  /**
   * 更新吸附点
   */
  private updateSnapPoint(pointGroup: Group, point: Point): void {
    const worldPoint = this.app.tree?.getWorldPoint(point)

    if (worldPoint) {
      pointGroup.set({
        visible: true,
        x: worldPoint.x,
        y: worldPoint.y,
      })
    }
  }

  /**
   * 清除吸附点
   */
  private clearSnapPoints(): void {
    [...this.verticalLinePoints, ...this.horizontalLinePoints].forEach((point) => {
      point.visible = false
    })
  }

  /**
   * 销毁渲染元素
   */
  private destroyRenderElements(): void {
    // 销毁吸附线
    ;[...this.verticalLines, ...this.horizontalLines].forEach((line) => {
      line.destroy()
    })

    // 销毁吸附点
    ;[...this.verticalLinePoints, ...this.horizontalLinePoints].forEach((point) => {
      point.destroy()
    })

    // 清空数组
    this.verticalLines = []
    this.horizontalLines = []
    this.verticalLinePoints = []
    this.horizontalLinePoints = []
  }
}
