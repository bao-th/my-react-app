function createElement(type, props, ...children) {
    // 核心逻辑不复杂，将参数都塞到一个对象上返回就行
    // children也要放到props里面去，这样我们在组件里面就能通过this.props.children拿到子元素
    return {
        type,
        props: {
            ...props,
            children
        }
    }
}

function render(vDom, container) {
    // let dom = createDom(vDom)

    // if (vDom.props && vDom.props.children && Array.isArray(vDom.props.children)) {
    //     vDom.props.children.forEach(child => render(child, dom));
    // } else if (vDom.props && vDom.props.children) {
    //     render(vDom.props.children, dom)
    // }

    // container.appendChild(dom)
    
    workInProgressRoot = {
        dom: container,
        props: {
            children: [vDom]
        },
        alternate: currentRoot
    }

    deletions = [];

    nextUnitOfWork = workInProgressRoot;
}

// 任务调度
let nextUnitOfWork = null;
let workInProgressRoot = null;
let currentRoot = null;
let deletions = null;

// workLoop用来调度任务
function workLoop(deadline) {
    while (nextUnitOfWork && deadline.timeRemaining() > 1) {
        // 这个while循环会在任务执行完或者时间到了的时候结束
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    }

    // 任务做完后统一渲染
    if (!nextUnitOfWork && workInProgressRoot) {
        commitRoot()
    }

    // 如果任务还没完，但是时间到了，我们需要继续注册requestIdleCallback
    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

// performUnitOfWork用来执行任务，参数是我们的当前fiber任务，返回值是下一个任务
function performUnitOfWork(fiber) {
    // 检测函数组件
    if (fiber.type instanceof Function) {
        updateFunctionComponent(fiber);
    } else {
        updateHostComponent(fiber)
    }

    // 这个函数的返回值是下一个任务，这其实是一个深度优先遍历
    // 先找子元素，没有子元素了就找兄弟元素
    // 兄弟元素也没有了就返回父元素
    // 然后再找这个父元素的兄弟元素
    // 最后到根节点结束
    // 这个遍历的顺序其实就是从上到下，从左到右
    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.return
    }

}

// 申明两个全局变量，用来处理useState
// wipFiber是当前的函数组件fiber节点
// hookIndex是当前函数组件内部useState状态计数
// let wipFiber = null;
// let hookIndex = null;

//更新函数组件真实dom
function updateFunctionComponent(fiber) {
    // 支持useState，初始化变量
    // wipFiber = fiber;
    // hookIndex = 0;
    // wipFiber.hooks = [];        // hooks用来存储具体的state序列

    // 函数组件的type就是个函数，直接拿来执行可以获得DOM元素
    const children = [fiber.type(fiber.props)];

    reconcileChildren(fiber, children);
}


//更新类组件真实dom
function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber);   // 创建一个DOM挂载上去
    }

    // if (fiber.return) {
    //     fiber.return.dom.appendChild(fiber.dom)
    // }

    // 将我们前面的vDom结构转换为fiber结构
    const elements = fiber.props && fiber.props.children;

    // 调和子元素
    reconcileChildren(fiber, elements);

}

//创建真实dom
function createDom(vDom) {
    let dom;

    // 检查当前节点是文本还是对象
    if (vDom.type === 'TEXT') {
        dom = document.createTextNode(vDom.props.nodeValue);
    } else {
        dom = document.createElement(vDom.type);

        // 将vDom上除了children外的属性都挂载到真正的DOM上去
        if (vDom.props) {
            Object.keys(vDom.props)
                .filter(key => key !== 'children')
                .forEach(item => {
                    if (item.indexOf('on') === 0) {
                        dom.addEventListener(item.substr(2).toLowerCase(), vDom.props[item], false)
                    } else {
                        dom[item] = vDom.props[item]
                    }
                })
        }
    }

    return dom;
}

// 调和子元素
function reconcileChildren(workInProgressFiber, elements) {
    // 将我们前面的vDom结构转换为fiber结构
    let oldFiber = workInProgressFiber.alternate && workInProgressFiber.alternate.child;  // 获取上次的fiber树
    let prevSibling = null;
    let index = 0;

    if (Object.prototype.toString.call(elements) === '[object String]') {
        elements = [{
            type: 'TEXT',
            props: {
                nodeValue: elements,
                children: []
            }
        }]
    }
    if (Object.prototype.toString.call(elements) === '[object Object]') {
        elements = [elements]
    }

    if (elements && Array.isArray(elements)) {
        // 第一次没有oldFiber，那全部是REPLACEMENT
        if (!oldFiber) {
            for (let i = 0; i < elements.length; i++) {
                const fiber = elements[i];
                const newFiber = {
                    type: fiber.type,
                    props: fiber.props,
                    dom: null,                    // 构建fiber时没有dom，下次perform这个节点是才创建dom  
                    return: workInProgressFiber,
                    alternate: null,              // 新增的没有老状态
                    effectTag: 'REPLACEMENT'      // 添加一个操作标记
                }

                // 父级的child指向第一个子元素
                if (i === 0) {
                    workInProgressFiber.child = newFiber
                } else {
                    // 每个子元素拥有指向下一个子元素的指针
                    prevSibling.sibling = newFiber
                }

                prevSibling = newFiber

            }
        }

        while (index < elements.length && oldFiber) {
            let element = elements[index]
            let newFiber = null;

            // 对比oldFiber和当前element
            const sameType = oldFiber && element && oldFiber.type === element.type
            // 先比较元素类型
            if (sameType) {
                newFiber = {
                    type: oldFiber.type,
                    props: element.props,
                    dom: oldFiber.dom,
                    return: workInProgressRoot,
                    alternate: oldFiber,          // 记录下上次状态
                    effectTag: 'UPDATE'           // 添加一个操作标记
                }
            } else if (!sameType && element) {
                newFiber = {
                    type: element.type,
                    props: element.props,
                    dom: null,
                    return: workInProgressRoot,
                    alternate: null,          // 记录下上次状态
                    effectTag: 'REPLACEMENT'           // 添加一个操作标记
                }
            } else if (!sameType && oldFiber) {
                // 如果类型不一样，没有新节点，有老节点，删除老节点
                oldFiber.effectTag = 'DELETION';   // 添加删除标记
                deletions.push(oldFiber);          // 一个数组收集所有需要删除的节点
            }

            oldFiber = oldFiber.sibling;     // 循环处理兄弟元素

            // 父级的child指向第一个子元素
            if (index === 0) {
                workInProgressFiber.child = newFiber;
            } else {
                // 每个子元素拥有指向下一个子元素的指针
                prevSibling.sibling = newFiber;
            }

            prevSibling = newFiber;
            index++;
        }
    }
}

// 统一操作DOM
function commitRoot() {
    deletions.forEach(commitRootImpl);     // 执行真正的节点删除
    commitRootImpl(workInProgressRoot.child) // 开启递归
    currentRoot = workInProgressRoot;    // 记录一下currentRoot
    workInProgressRoot = null // 操作完后将workInProgressRoot重置
    console.log('currentRoot', currentRoot);
}

function commitRootImpl(fiber) {
    if (!fiber) {
        return
    }
    // const parentDom = fiber.return.dom;
    // 向上查找真正的DOM
    let parentFiber = fiber.return
    //函数组件 函数那一层，type为函数，没有dom，所以需要找父级vDom
    while (!parentFiber.dom) {
        parentFiber = parentFiber.return
    }
    const parentDom = parentFiber.dom

    if (fiber.effectTag === 'REPLACEMENT' && fiber.dom) { // 函数组件，函数这一层，没有dom所以跳过处理
        parentDom.appendChild(fiber.dom)
    } else if (fiber.effectTag === 'DELETION') {
        // parentDom.removeChild(fiber.dom);
        commitDeletion(fiber, parentDom) //支持函数组件呢
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom) {
        // 更新DOM属性
        updateDom(fiber.dom, fiber.alternate.props, fiber.props);
    }

    // 递归操作子元素和兄弟元素
    commitRootImpl(fiber.child);
    commitRootImpl(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        // dom存在，是普通节点
        domParent.removeChild(fiber.dom);
    } else {
        // dom不存在，是函数组件,向下递归查找真实DOM
        commitDeletion(fiber.child, domParent);
    }
}

// 更新DOM的操作
function updateDom(dom, prevProps, nextProps) {
    // 1. 过滤children属性
    // 2. 老的存在，新的没了，取消
    // 3. 新的存在，老的没有，新增
    Object.keys(prevProps)
        .filter(name => name !== 'children')
        .filter(name => !(name in nextProps))
        .forEach(name => {
            if (name.indexOf('on') === 0) {
                dom.removeEventListener(name.substr(2).toLowerCase(), prevProps[name], false)
            } else {
                dom[name] = ''
            }
        })

    Object.keys(nextProps)
        .filter(name => name !== 'children')
        .forEach(name => {
            if (name.indexOf('on') === 0) {
                dom.addEventListener(name.substr(2).toLowerCase(), nextProps[name], false)
            } else {
                dom[name] = nextProps[name]
            }
        })
}

export default { createElement, render }