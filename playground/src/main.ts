import { Snap } from '@cr/lib'
import { App, Debug, Frame } from 'leafer-ui'
import '@leafer-in/editor'
import '@leafer-in/viewport'
import '@leafer-in/view'

const app = new App({
  view: window,
  editor: {
    hideOnMove: true,
  },
})

Debug.showBounds = false

const frame = new Frame({
  tag: 'Frame',
  fill: [
    {
      type: 'solid',
      color: '#ececec',
    },
  ],
  overflow: 'hide',
  id: '663c5b6f-cb99-4d9b-b9b8-8fdc5c023e8e',
  children: [
    {
      tag: 'Star',
      corners: 5,
      name: '图层3',
      zIndex: 4,
      x: 114.59459459459464,
      y: 308.1081081081081,
      width: 147.56756756756755,
      height: 151.8918918918919,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgba(240, 197, 67, 1)',
        },
      ],
    },
    {
      tag: 'Ellipse',
      name: '图层1',
      zIndex: 1,
      x: 741.0810810810809,
      y: 345.40540540540536,
      width: 100,
      height: 100,
      rotation: 0,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgb(50,205,121)',
        },
      ],
    },
    {
      tag: 'Ellipse',
      innerRadius: 0.5,
      name: '图层2',
      zIndex: 2,
      x: 227.5675675675676,
      y: 115.13513513513514,
      width: 100,
      height: 100,
      rotation: 0,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgba(167, 243, 116, 1)',
        },
      ],
    },
    {
      tag: 'Star',
      corners: 8,
      innerRadius: 0.5,
      name: '图层5',
      zIndex: 6,
      x: 410.81081081081084,
      y: 276.7567567567567,
      width: 169.1891891891892,
      height: 181.08108108108107,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgba(50, 66, 205, 1)',
        },
      ],
      cornerRadius: 5,
    },
    {
      tag: 'Star',
      corners: 8,
      innerRadius: 0.5,
      name: '图层5',
      zIndex: 6,
      x: 310.81081081081084,
      y: 676.7567567567567,
      width: 169.1891891891892,
      height: 181.08108108108107,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'pink',
        },
      ],
      cornerRadius: 5,
    },
    {
      tag: 'Star',
      corners: 8,
      innerRadius: 0.5,
      name: '图层5',
      zIndex: 6,
      x: 1210.8108108108108,
      y: 276.7567567567567,
      width: 169.1891891891892,
      height: 181.08108108108107,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgba(1, 138, 215, 1)',
        },
      ],
      cornerRadius: 5,
    },
    {
      tag: 'Star',
      corners: 8,
      innerRadius: 0.5,
      name: '图层5',
      zIndex: 6,
      x: 1010.8108108108108,
      y: 476.7567567567567,
      width: 169.1891891891892,
      height: 181.08108108108107,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgba(50, 66, 205, 1)',
        },
      ],
      cornerRadius: 5,
    },
    {
      tag: 'Text',
      fill: [
        {
          type: 'solid',
          color: 'rgba(0,0,0,1)',
        },
      ],
      text: '文本内容1',
      fontSize: 40,
      fontWeight: 'normal',
      lineHeight: {
        type: 'percent',
        value: 1.5,
      },
      name: '图层6',
      visible: true,
      zIndex: 7,
      x: 357.59083653379696,
      y: 610.3109655782202,
      rotation: -32.82,
      editable: true,
    },
    {
      tag: 'Text',
      width: 400,
      height: 80,
      fill: 'rgba(246,207,0,1)',
      text: '文本内容2',
      fontFamily: 'arial',
      fontSize: 80,
      fontWeight: 'bold',
      lineHeight: {
        type: 'percent',
        value: 1,
      },
      textAlign: 'center',
      id: '39b2d1d6-7e23-40d3-9fb8-cd9e96f6244a',
      name: '图层8',
      opacity: 1,
      zIndex: 10,
      x: 499.4594594594595,
      y: 149.43243243243242,
      editable: true,
      stroke: 'rgba(0,0,0,1)',
      strokeWidth: 3,
      strokeJoin: 'miter',
    },
    {
      tag: 'Text',
      fill: 'rgba(246,207,0,1)',
      text: '不可被吸附',
      fontFamily: 'arial',
      fontSize: 20,
      isSnap: false,
      fontWeight: 'bold',
      lineHeight: {
        type: 'percent',
        value: 1,
      },
      textAlign: 'center',
      id: '39b2d1d6-7e23-40d3-9fb8-cd9e96f6244a',
      name: '图层8',
      opacity: 1,
      x: 100.4594594594595,
      y: 100.4343243243242,
      editable: true,
      stroke: 'rgba(0,0,0,1)',
      strokeWidth: 3,
      strokeJoin: 'miter',
    },
    {
      tag: 'Text',
      width: 400,
      height: 80,
      fill: 'rgba(246,207,0,1)',
      text: '文本内容3',
      fontFamily: 'arial',
      fontSize: 80,
      fontWeight: 'bold',
      lineHeight: {
        type: 'percent',
        value: 1,
      },
      textAlign: 'center',
      id: '39b2d1d6-7e23-40d3-9fb8-cd9e96f6244a',
      name: '图层8',
      opacity: 1,
      zIndex: 10,
      x: 1008.4594594594595,
      y: 22.43243243243242,
      rotation: 30,
      editable: true,
      stroke: 'rgba(0,0,0,1)',
      strokeWidth: 3,
      strokeJoin: 'miter',
    },
    {
      tag: 'Star',
      corners: 3,
      innerRadius: 0.15,
      name: '图层9',
      zIndex: 12,
      x: 987.027027027027,
      y: 209.4594594594594,
      width: 170.27027027027026,
      height: 161.6216216216216,
      rotation: 37.45,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgba(236, 134, 231, 1)',
        },
      ],
    },
    {
      tag: 'Star',
      corners: 4,
      innerRadius: 0.1,
      name: '图层10',
      zIndex: 13,
      x: 136.92544537618699,
      y: 516.118558786042,
      rotation: 37.45,
      draggable: true,
      editable: true,
      fill: [
        {
          type: 'solid',
          color: 'rgb(50,205,121)',
        },
      ],
    },
  ],
  x: 0,
  y: 0,
})

// 监听窗口尺寸
window.addEventListener('resize', () => {
  updateSize()
})

function updateSize() {
  frame.set({
    width: innerWidth,
    height: innerHeight,
  })
}

updateSize()

app.tree.add(frame as any)

const snap = new Snap(app)

// 更新容器
snap.updateConfig({
  parentContainer: frame,
})

snap.enable(true)

;(window as any).app = app
