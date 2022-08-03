# React

## JSX

1. `React.createElement`

```js
;<h1 id="title">Title</h1>

vDom = {
  type: "h1",
  props: {
    id: "title",
    children: "Title"
  }
}
```

2. `ReactDOM.render`

```
1.根组件，其实是一个JSX组件，也就是一个createElement返回的虚拟DOM
2.父节点，也就是我们要将这个虚拟DOM渲染的位置

```

## render 和 commit

```
reconciler的一大功能就是大家熟知的diff，他会计算出应该更新哪些页面节点，然后将需要更新的节点虚拟DOM传递给renderer，renderer负责将这些节点渲染到页面上。但是这个流程有个问题，虽然React的diff算法是经过优化的，但是他却是同步的，renderer负责操作DOM的appendChild等API也是同步的，也就是说如果有大量节点需要更新，JS线程的运行时间可能会比较长，在这段时间浏览器是不会响应其他事件的，因为JS线程和GUI线程是互斥的，JS运行时页面就不会响应，这个时间太长了，用户就可能看到卡顿，特别是动画的卡顿会很明显。
```

`https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3b66be47c86c47128bdb7e8658c11c8b~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp`

`https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/63a2151be17848189897d8a12e4becbf~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp`

### Fiber

```
Fiber可以将长时间的同步任务拆分成多个小任务，从而让浏览器能够抽身去响应其他事件，等他空了再回来继续计算，这样整个计算流程就显得平滑很多。
```

### 需要解决的两个问题

```
1.新的任务调度，有高优先级任务的时候将浏览器让出来，等浏览器空了再继续执行
2.新的数据结构，可以随时中断，下次进来可以接着执行
```

```js
// 开启调用
var handle = window.requestIdleCallback(callback[(IdleDeadline, options)])
// 结束调用
Window.cancelIdleCallback(handle)
```

### Fiber 可中断数据结构

```
Fiber之前的数据结构是一棵树，父节点的children指向了子节点，但是只有这一个指针是不能实现中断继续的。比如我现在有一个父节点A，A有三个子节点B,C,D，当我遍历到C的时候中断了，重新开始的时候，其实我是不知道C下面该执行哪个的，因为只知道C，并没有指针指向他的父节点，也没有指针指向他的兄弟。Fiber就是改造了这样一个结构，加上了指向父节点和兄弟节点的指针。
```

`https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c50096317b7e42178b59ca4e30e7ad08~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp`

```
1.child: 父节点指向第一个子元素的指针。
2.sibling：从第一个子元素往后，指向下一个兄弟元素。
3.return：所有子元素都有的指向父元素的指针。
```

```js
// 文本定义类型
{
    type: 'TEXT',
    props: {
        nodeValue: elements,
        children: []
    }
}
```

### 统一 commit DOM 操作

```
上面我们的performUnitOfWork一边构建Fiber结构一边操作DOMappendChild，这样如果某次更新好几个节点，操作了第一个节点之后就中断了，那我们可能只看到第一个节点渲染到了页面，后续几个节点等浏览器空了才陆续渲染。为了避免这种情况，我们应该将DOM操作都搜集起来，最后统一执行，这就是commit。为了能够记录位置，我们还需要一个全局变量 workInProgressRoot 来记录根节点，然后在workLoop检测如果任务执行完了，就commit。
```

```js
workInProgressRoot = {
  dom: container,
  props: {
    children: [vDom]
  },
  alternate: currentRoot
}
updateHostComponent()
```

## reconcile 调和

```
reconcile其实就是虚拟DOM树的diff操作，需要删除不需要的节点，更新修改过的节点，添加新的节点。为了在中断后能回到工作位置，我们还需要一个变量 currentRoot ，然后在fiber节点里面添加一个属性 alternate ，这个属性指向上一次运行的根节点，也就是currentRoot。currentRoot会在第一次render后的commit阶段赋值，也就是每次计算完后都会把当次状态记录在alternate上，后面更新了就可以把alternate拿出来跟新的状态做diff。然后performUnitOfWork里面需要添加调和子元素的代码，可以新增一个函数reconcileChildren。这个函数里面不能简单的创建新节点了，而是要将老节点跟新节点拿来对比;

注意删除老节点的操作是直接将oldFiber加上一个删除标记就行，同时用一个全局变量 deletions 记录所有需要删除的节点;

然后就是在commit阶段处理真正的DOM操作，具体的操作是根据我们的effectTag来判断的
```

- 对比逻辑如下:

1. 如果新老节点类型一样，复用老节点 DOM，更新 props //effectTag: 'UPDATE'
2. 如果类型不一样，而且新的节点存在，创建新节点替换老节点 //effectTag: 'REPLACEMENT'
3. 如果类型不一样，没有新节点，有老节点，删除老节点 //effectTag: 'DELETION'

```js
newFiber = {
  type: oldFiber.type,
  props: element.props,
  dom: oldFiber.dom,
  return: workInProgressRoot,
  alternate: oldFiber, // 记录下上次状态
  effectTag: "UPDATE" // 添加一个操作标记
}
```

## 函数组件

```
我们之前的fiber节点上的type都是DOM节点的类型，比如h1什么的，但是函数组件的节点type其实就是一个函数了，我们需要对这种节点进行单独处理;

首先需要在更新的时候检测当前节点是不是函数组件，如果是，children的处理逻辑会稍微不一样;
```

```
然后在我们提交DOM操作的时候因为函数组件没有DOM元素，所以需要注意两点:

1.提交时，获取父级DOM元素的时候需要递归网上找真正的DOM
2.删除节点的时候需要递归往下找真正的节点
3.performUnitOfWork中updateFunctionComponent
```
