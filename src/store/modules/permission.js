import {asyncRouterMap, constantRouterMap} from '@/router/index'
import Layout from '@/views/layout/Layout'
import {componentsMap} from '../constants'

/**
 * 判断用户是否拥有此菜单
 * @param menus
 * @param route
 */
function hasPermission(menus, route) {
  if (route.menu) {
    /*
    * 如果这个路由有menu属性,就需要判断用户是否拥有此menu权限
    */
    return menus.indexOf(route.menu) > -1;
  } else {
    return true
  }
}

/**
 * 递归过滤异步路由表，返回符合用户菜单权限的路由表
 * @param asyncRouterMap
 * @param menus
 */
function filterAsyncRouter(asyncRouterMap, menus) {
  const accessedRouters = asyncRouterMap.filter(route => {
    //filter,js语法里数组的过滤筛选方法
    if (hasPermission(menus, route)) {
      if (route.children && route.children.length) {
        //如果这个路由下面还有下一级的话,就递归调用
        route.children = filterAsyncRouter(route.children, menus)
        //如果过滤一圈后,没有子元素了,这个父级菜单就也不显示了
        return (route.children && route.children.length)
      }
      return true
    }
    return false
  })
  return accessedRouters
}


/**
 * 暂不支持多层级目录
 * 递归过滤异步路由表，返回符合用户菜单权限的路由表
 * @param asyncRouterMap
 */
function convertRouter(asyncRouterMap) {
  const accessedRouters = []
  if (asyncRouterMap) {
    asyncRouterMap.forEach(item => {
      const parent = generateRouter(item, true)
      const children = []
      if (item.children && (Array.prototype.isPrototypeOf(item.children) && item.children.length !== 0)) {
        item.children.forEach(child => {
          children.push(generateRouter(child, false))
        })
      }
      parent.children = children
      accessedRouters.push(parent)
    })
  }
  accessedRouters.push({path: '*', redirect: '/404', hidden: true})
  return accessedRouters
}

function generateRouter(item, isParent) {
  return {
    path: item.path,
    name: item.name,
    meta: item.meta,
    component: isParent ? Layout : componentsMap[item.name]
  }
}

const permission = {
  state: {
    routers: constantRouterMap, //本用户所有的路由,包括了固定的路由和下面的addRouters
    addRouters: [] //本用户的角色赋予的新增的动态路由
  },
  mutations: {
    SET_ROUTERS: (state, routers) => {
      state.addRouters = routers
      state.routers = constantRouterMap.concat(routers) //将固定路由和新增路由进行合并, 成为本用户最终的全部路由信息
    }
  },
  actions: {
    GenerateRoutes({commit}, userPermission) {
      //生成路由
      return new Promise(resolve => {
        //roles是后台传过来的角色数组,比如['管理员','风控主管']
        const roles = userPermission.roles;
        const menus = userPermission.menuList;
        //声明 该角色可用的路由
        let accessedRouters = convertRouter(menus)
        // let accessedRouters;
        // if (roles.indexOf('admin') > -1) {
        //   //其实管理员也拥有全部菜单,这里主要是利用角色判断,节省加载时间
        //   accessedRouters = asyncRouterMap
        // } else {
        //   //否则需要通过以下方法来筛选出本角色可用的路由
        //   accessedRouters = filterAsyncRouter(asyncRouterMap, menus)
        // }
        //执行设置路由的方法
        commit('SET_ROUTERS', accessedRouters)
        resolve()
      })
    }
  }
}
export default permission