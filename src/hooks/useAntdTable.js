import { useEffect, useState } from 'react'

/**
 * 
 * @param {Function} getDataSourceFunc 
 * @param {Array} columnMaps [{GROUP_NAME: "", KEY: "", NAME: "", render(){} }]
 * @param {Boolean} otherConfig { 
 *                                initNotLoad: false, //初始化不加载数据
 *                                showSizeChanger: false, //是否展示 pageSize 切换器，当 total 大于 50 时默认为 true
 *                              } 
 * @returns 
 */

function useAntdTable(getDataSourceFunc, columnMaps, otherConfig = { initNotLoad: false, showSizeChanger: false }) {
    if (typeof getDataSourceFunc !== 'function') {
        throw TypeError('参数getDataSourceFunc为函数')
    }
    if (!Array.isArray(columnMaps)) {
        throw TypeError('参数columnMaps为对象数组')
    }

    //state
    const [dataSource, setDataSource] = useState([]) //表格数据
    const [listTotalLength, setListTotalLength] = useState(0) //表格数据总数
    const [currentPage, setCurrentPage] = useState(1) //当前页
    const [pageSizeLength, setPageSizeLength] = useState() //每页数据个数,初始化时每页个数由getDataSourceFunc决定
    const [loading, setLoading] = useState(false) //loading

    //列
    const columns = columnMaps.map(item => ({
        title: item.NAME,
        dataIndex: item.KEY,
        align: 'center',
        render: item.render || (text => text || '-'),
        ...item.columnProps,
    })) || []

    useEffect(() => {
        !otherConfig.initNotLoad && _load(currentPage)
        // eslint-disable-next-line 
    }, [currentPage])

    //查询表格数据
    function _load(nextPage = currentPage, pageSize = pageSizeLength) {
        setLoading(true)
        getDataSourceFunc(nextPage, pageSize)
            .then(data => {
                if (data === null) { return }

                let list = data.list
                let tableTotalLength = data.page?.rowTop
                let tablePageSize = data.page?.rowsPage || list.length

                if (!Array.isArray(list)) {
                    throw TypeError('数据生成函数返回的list必须是列表数据')
                }

                setDataSource(list.map((item, index) => {
                    item.key = index
                    return item
                }))
                setListTotalLength(tableTotalLength)
                setPageSizeLength(tablePageSize)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    return {
        currentPage,
        search: () => _load(), //向外暴露的查询当前页的方法，不接受任何参数
        loadPage: (page) => setCurrentPage(page), //向外暴露的查询指定页的方法，接受一个参数为页数
        //antdTableProps
        columns,
        dataSource,
        loading,
        bordered: true,
        pagination: listTotalLength ? {
            showQuickJumper: true,
            showSizeChanger: otherConfig.showSizeChanger,
            onShowSizeChange: (current, pageSize) => _load(current, pageSize),
            current: currentPage,
            total: listTotalLength,
            showTotal: (total, range) => `共 ${total} 条记录`,
            // defaultPageSize: 20,
            pageSize: pageSizeLength,
        } : false,
        onChange: (pagination) => setCurrentPage(pagination.current),
    }
}

export default useAntdTable