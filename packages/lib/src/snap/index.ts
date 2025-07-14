/**
 * Snap 吸附功能主模块
 * 提供基于 Leafer 的智能吸附功能，支持元素对齐和精确定位
 *
 * 工作原理：
 * 1. 监听编辑器移动事件
 * 2. 收集可吸附元素的边界点
 * 3. 创建垂直和水平吸附线
 * 4. 检测目标元素与吸附线的碰撞
 * 5. 应用吸附偏移并渲染可视化提示
 * 6. 显示距离标签提供距离参考
 */

import type { EditorEvent } from '@leafer-in/editor'
import type { ISimulateElement } from '@leafer-in/interface'
import type { Box } from '@leafer-ui/core'
import type { IApp, IUI } from '@leafer-ui/interface'
import type { LineCollisionResult, SnapConfig, SnapLine, SnapPoint } from './types'
import { EditorMoveEvent } from '@leafer-in/editor'
import { dataType, KeyEvent, LayoutEvent, PointerEvent, UI } from '@leafer-ui/core'
import { DEFAULT_CONFIG } from './config'
import {
  calculateSnap,
  createSnapLines,
  createSnapPoints,
  filterMidPoints,
  selectBestLineCollision,
} from './snap-calc'
import {
  destroyRenderElements,
  drawDistanceLabels,
  drawDistanceLines,
  drawEqualSpacingBoxes,
  drawLines,
  drawSnapPoints,
  hideRenderElements,
} from './snap-render'
import {
  calculateDistanceLabels,
  calculateEqualSpacing,
  getAllElements,
  getElementBoundPoints,
  getViewportElements,
  toFixed,
} from './utils'

// 扩展UI元素属性
UI.addAttr('isSnap', true, dataType)

declare module '@leafer-ui/interface' {
  interface ILeafAttrData {
    isSnap?: boolean
  }
}

/**
 * Snap 吸附功能主类
 * 管理吸附功能的生命周期、事件处理和状态管理
 */
export class Snap {
  private readonly app: IApp
  private config: Required<SnapConfig>

  // 吸附相关状态
  private snapElements: IUI[] = [] // 所有可吸附元素
  private snapPoints: SnapPoint[] = [] // 所有可吸附元素的边界点
  private snapLines: SnapLine[] = [] // 由边界点组成的吸附线
  private isSnapping = false // 是否正在吸附
  private isKeyEvent = false // 是否为键盘事件（避免键盘移动时吸附）
  private isEnabled = false // 吸附功能是否启用

  // 渲染元素缓存
  private verticalLines: any[] = [] // 垂直吸附线元素
  private horizontalLines: any[] = [] // 水平吸附线元素
  private linePointGroups: any[] = [] // 吸附点标记
  private distanceLabels: Box[] = [] // 距离标签元素
  private distanceLines: any[] = [] // 距离线段元素
  private equalSpacingBoxes: Box[] = [] // 等宽间距Box缓存

  private get cachedElements(): IUI[][] {
    return [
      this.verticalLines,
      this.horizontalLines,
      this.linePointGroups,
      this.distanceLabels,
      this.distanceLines,
      this.equalSpacingBoxes,
    ]
  }

  private get cachedSnaps(): any[][] {
    return [
      this.snapPoints,
      this.snapLines,
      this.snapElements,
    ]
  }

  /**
   * 构造函数
   * @param app Leafer应用实例
   * @param config 吸附配置选项
   */
  constructor(app: IApp, config?: SnapConfig) {
    if (!app?.isApp)
      throw new Error('参数必须是有效的 App 实例')
    if (!app.tree)
      throw new Error('App 必须包含 tree 层')
    if (!app.editor)
      throw new Error('App 必须包含 editor')
    this.app = app
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.bindEventHandlers()
  }

  /**
   * 获取父容器
   * 用于确定吸附元素的范围
   */
  get parentContainer() {
    return this.config.parentContainer || this.app.tree
  }

  /**
   * 获取图层缩放比例
   * 用于计算吸附范围的实际像素值
   */
  get layerScale() {
    return this.app.zoomLayer?.scaleX || 1
  }

  /**
   * 绑定事件处理器
   * 确保事件处理函数中的 this 指向正确
   */
  private bindEventHandlers(): void {
    this.handleBeforeMove = this.handleBeforeMove.bind(this)
    this.handleMove = this.handleMove.bind(this)
    this.clear = this.clear.bind(this)
    this.destroy = this.destroy.bind(this)
    this.handleKeyEvent = this.handleKeyEvent.bind(this)
  }

  /**
   * 启用或禁用吸附功能
   * @param enabled 是否启用
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
      this.destroy()
    }
  }

  /**
   * 更新吸附配置
   * @param config 新的配置选项
   */
  public updateConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 绑定事件监听
   * 监听编辑器移动、鼠标释放、布局变化和键盘事件
   */
  private attachEvents(): void {
    const { editor } = this.app
    editor?.on(EditorMoveEvent.BEFORE_MOVE, this.handleBeforeMove)
    editor?.on(EditorMoveEvent.MOVE, this.handleMove)
    this.app.on(PointerEvent.UP, this.destroy)
    this.app.tree?.on(LayoutEvent.AFTER, this.clear)
    this.app.on([KeyEvent.DOWN, KeyEvent.UP], this.handleKeyEvent, { capture: true })
  }

  /**
   * 解绑事件监听
   * 清理所有事件监听器
   */
  private detachEvents(): void {
    const { editor } = this.app
    editor?.off(EditorMoveEvent.BEFORE_MOVE, this.handleBeforeMove)
    editor?.off(EditorMoveEvent.MOVE, this.handleMove)
    this.app.off(PointerEvent.UP, this.destroy)
    this.app.tree?.off(LayoutEvent.AFTER, this.clear)
    this.app.off([KeyEvent.DOWN, KeyEvent.UP], this.handleKeyEvent, { capture: true })
  }

  /**
   * 处理移动前事件
   * 收集可吸附元素并创建吸附点和吸附线
   * @param _e 编辑器事件
   */
  private handleBeforeMove(_e: EditorEvent): void {
    if (!this.isEnabled || this.isSnapping)
      return
    this.snapElements = this.collectSnapElements()
    this.snapPoints = this.snapElements.map(el => createSnapPoints(el, el => getElementBoundPoints(el, this.app.tree))).flat()
    this.snapLines = createSnapLines(this.snapPoints)
    this.isSnapping = true
  }

  /**
   * 处理移动事件
   * 计算吸附结果并应用吸附偏移
   * @param event 移动事件
   */
  private handleMove(event: EditorMoveEvent): void {
    if (!this.isEnabled)
      return
    const { moveX, moveY } = event
    if (!moveX && !moveY)
      return

    this.executeMove(event)
  }

  /**
   * 执行移动处理逻辑
   * 实际的吸附计算和渲染逻辑
   * @param event 移动事件
   */
  private executeMove(event: EditorMoveEvent): void {
    const { target } = event

    if (this.isSnapping) {
      hideRenderElements([
        ...this.verticalLines,
        ...this.horizontalLines,
        ...this.distanceLabels,
        ...this.equalSpacingBoxes,
      ])
    }
    const targetPoints = getElementBoundPoints(target, this.app.tree)

    const snapResult = calculateSnap(
      targetPoints,
      this.snapLines,
      this.config.snapSize,
    )

    this.applySnapOffset(target, {
      x: selectBestLineCollision(snapResult.x),
      y: selectBestLineCollision(snapResult.y),
    })

    if (this.config.showLine && (snapResult.x.length || snapResult.y.length)) {
      this.renderSnapLines(target, snapResult)
    }

    // 计算并渲染等宽间距
    if (this.config.showEqualSpacingBoxes) {
      const snapElements = this.snapElements.filter(el => el !== this.parentContainer)
      const equalSpacingResults = calculateEqualSpacing(target, snapElements, this.app.tree)
      drawEqualSpacingBoxes(equalSpacingResults, this.equalSpacingBoxes, this.app, this.config)
    }
  }

  /**
   * 处理键盘事件
   * 检测方向键事件，避免键盘移动时触发吸附
   * @param e 键盘事件
   */
  private handleKeyEvent(e: KeyEvent): void {
    const arrowKeys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']
    if (arrowKeys.includes(e.code)) {
      this.isKeyEvent = e.type === KeyEvent.DOWN
    }
  }

  /**
   * 清除吸附状态
   * 隐藏吸附线、吸附点标记和距离标签
   */
  private clear(): void {
    destroyRenderElements(this.cachedElements.flat())
    this.cachedElements.forEach(group => group.length = 0)
  }

  /**
   * 销毁吸附实例
   * 清理事件监听和渲染元素
   */
  public destroy(): void {
    this.clear()
    this.cachedSnaps.forEach(group => group.length = 0)
    this.isSnapping = false
  }

  /**
   * 收集可吸附元素
   * 过滤出可用于吸附的元素（排除选中元素、无效元素等）
   * @returns 可吸附元素列表
   */
  public collectSnapElements(): IUI[] {
    const selectedElements = this.app.editor?.list || []
    const allElements = this.config.viewportOnly
      ? getViewportElements(this.parentContainer, this.app.zoomLayer, this.app.tree)
      : getAllElements(this.parentContainer)
    return allElements.filter((element) => {
      if (selectedElements.includes(element))
        return false
      if (!element.isSnap)
        return false
      return this.config.filter(element)
    })
  }

  /**
   * 应用吸附偏移
   * 根据碰撞结果调整目标元素的位置
   * @param target 目标元素
   * @param snapResult X轴和Y轴的碰撞结果
   */
  private applySnapOffset(target: IUI, snapResult: {
    x: LineCollisionResult | null
    y: LineCollisionResult | null
  }): void {
    if (this.isKeyEvent)
      return
    function handle(ui: any, axis: any, snap: LineCollisionResult) {
      ui[axis] = ui[axis] - snap.offset
    }
    Object.entries(snapResult).forEach(([axis, snap]) => {
      if (snap) {
        const editor = this.app.editor
        editor.list.forEach((element: any) => handle(element, axis, snap))
        if (editor.multiple) {
          (target as ISimulateElement).safeChange?.(() => handle(target, axis, snap))
        }
      }
    })
  }

  /**
   * 渲染吸附线和距离标签
   * 根据碰撞结果绘制吸附线、吸附点标记和距离标签
   * @param target 目标元素
   * @param snapResult 碰撞结果
   */
  private renderSnapLines(
    target: IUI,
    snapResult: { x: LineCollisionResult[], y: LineCollisionResult[] },
  ): void {
    const linesToDraw: { vertical: number[][], horizontal: number[][] } = { vertical: [], horizontal: [] }
    const allCollisionPoints: any[] = []
    const targetSnapPoints: any[] = createSnapPoints(target, el => getElementBoundPoints(el, this.app.tree))
    const targetSnapLines: any[] = createSnapLines(targetSnapPoints)

    // 用于创建距离标签的碰撞结果，只考虑在吸附线上的碰撞点
    const distanceLabelsSnapResults: { x: LineCollisionResult[], y: LineCollisionResult[] } = {
      x: [],
      y: [],
    }
    // 处理X轴和Y轴的碰撞结果
    Object.entries(snapResult).forEach(([axis, results]) => {
      results.forEach((result) => {
        const { line, collisionPoints } = result
        const sameTypeLines = targetSnapLines.filter((v: any) => v.type === line.type && toFixed(v.value, 0) === toFixed(line.value, 0))
        if (sameTypeLines.length > 0) {
          const allPoints = filterMidPoints(axis, [
            ...collisionPoints,
            ...sameTypeLines.map((v: any) => v.points).flat(),
          ])
          const invertedAxis = axis === 'x' ? 'y' : 'x'
          if (allPoints.length > 0) {
            distanceLabelsSnapResults[axis as 'x' | 'y'].push(result)
            const min = Math.min(...allPoints.map((p: any) => p[invertedAxis]))
            const max = Math.max(...allPoints.map((p: any) => p[invertedAxis]))
            if (axis === 'x') {
              linesToDraw.vertical.push([line.value, min, line.value, max])
            }
            else {
              linesToDraw.horizontal.push([min, line.value, max, line.value])
            }
            allCollisionPoints.push(...allPoints)
          }
        }
      })
    })

    // 绘制吸附线和吸附点
    drawLines(linesToDraw.vertical, 'vertical', this.verticalLines, this.app, this.config)
    drawLines(linesToDraw.horizontal, 'horizontal', this.horizontalLines, this.app, this.config)
    if (this.config.showLinePoints) {
      drawSnapPoints(allCollisionPoints, this.linePointGroups, this.app, this.config)
    }

    // 绘制距离线段和标签
    if (this.config.showDistanceLabels) {
      const distanceLabels = calculateDistanceLabels(
        target,
        distanceLabelsSnapResults,
        this.app.tree,
        this.layerScale,
      )
      drawDistanceLines(distanceLabels, this.distanceLines, this.app, this.config)
      drawDistanceLabels(distanceLabels, this.distanceLabels, this.app, this.config)
    }
  }
}
