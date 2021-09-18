import type { Settings as LayoutSettings } from '@ant-design/pro-layout';
import { PageLoading } from '@ant-design/pro-layout';
import type { RunTimeLayoutConfig , RequestConfig } from 'umi';
import { history, Link } from 'umi';
import RightContent from '@/components/RightContent';
import Footer from '@/components/Footer';
import { currentUser as queryCurrentUser , menuListByUserId } from './services/ant-design-pro/api';
import { BookOutlined, LinkOutlined } from '@ant-design/icons';
import * as allIcons from '@ant-design/icons';
import type { MenuDataItem } from '@umijs/route-utils';
import React from 'react';
import { ResponseError } from 'umi-request';
import { notification } from 'antd';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';
const registerPath = '/user/register';

let initUserId:any = 0

const fixMenuItemIcon = (menus: MenuDataItem[], iconType = 'Outlined'): MenuDataItem[] => {
  menus.forEach((item) => {
    const { icon } = item;  //{ icon,children} in item
    if (typeof icon === 'string') {
      let fixIconName = icon.slice(0, 1).toLocaleUpperCase() + icon.slice(1) + iconType;
      item.icon = React.createElement(allIcons[fixIconName] || allIcons[icon]);
    }
    //children && children.length > 0 ? (item.children = fixMenuItemIcon(children)) : null;
  });
  return menus;
};


/** 获取用户信息比较慢的时候会展示一个 loading */
export const initialStateConfig = {
  loading: <PageLoading  />,
};

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  setUserId?:(userId?: number) => void;
  getUserToken?:() => string;
  fetchUserInfo?: (userId?:number) => Promise<API.CurrentUser | undefined>;
}> {

  const setUserId = async (userId?:number) => {
    initUserId = userId
    sessionStorage.setItem("userId",initUserId)
  }

  const getUserToken = () => {
     var token = sessionStorage.getItem("loginStatus")
     if (token != null ) {
       return token
     } else {
       return ""
     }
  }
  
  const fetchUserInfo = async (userId?:number) => {
    try {
      console.log("get user info")
      const msg = await queryCurrentUser({ params:{ id: userId }});
      return msg.data;
    } catch (error) {
      history.push(loginPath);
    }
    return undefined;
  };
  // 如果是登录页面，不执行
  if (history.location.pathname !== loginPath) {
    if (initUserId == 0) {
      var id = sessionStorage.getItem("userId")
      if (id != null) {
        initUserId = Number(id)
      } else {
        history.push(loginPath)
      }
    }

    const currentUser = await fetchUserInfo(initUserId);
    return {
      fetchUserInfo,
      currentUser,
      settings: {},
      setUserId,
      getUserToken
    };
  }
  return {
    fetchUserInfo,
    settings: {},
    setUserId,
    getUserToken
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  return {
    rightContentRender: () => <RightContent />,
    disableContentMargin: false,
    waterMarkProps: {
      content: initialState?.currentUser?.name,
    },
    menu: {
      params: {
          userId: initialState?.currentUser?.userid,
      },
      request: async (params, defaultMenuData) => {
        //console.log(params)
        //console.log(defaultMenuData)
        const userId = params?.userId
        if (userId == undefined || userId == "") {
          return defaultMenuData
        } else {
          let menuResponse = await menuListByUserId({ params:{ id: userId } })
          //console.log(menuResponse.data)
          let menuListJson : string = menuResponse.data
          let menuList: MenuDataItem[] = JSON.parse(menuListJson);
          return menuList
        }
        return defaultMenuData
      }
    },  
    menuDataRender: (menuData) => {
        return fixMenuItemIcon(menuData)
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (location.pathname == registerPath) {
        history.push(registerPath);
        return 
      }
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    links: isDev
      ? [
          <Link to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
          <Link to="/~docs">
            <BookOutlined />
            <span>业务组件文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    ...initialState?.settings,
  };
};


const headerInterceptor = (url: string, options: RequestInit) => {
  if ( sessionStorage.getItem("loginStatus")) {
    const token = sessionStorage.getItem("loginStatus")
    options.headers = {
      ...options.headers,
      "Authorization" : 'Bearer ' + token
    }
  }
  return {url,options}
}

const errorHandler = (error:ResponseError) => {
  const { response } = error;
  if (response && response.status) {

    if (response.status == 401) {
      notification.error({
        message: '未授权的请求，请重新登录' , 
        description: '访问被拒绝'
      })
      sessionStorage.clear()
      history.push(loginPath)
    } else {
        const errorText = response.statusText
        const {status ,url} = response

        notification.error({
          message: `请求错误 ${status} : ${url}` , 
          description: errorText
        })
    }
  }

  if (!response) {
      notification.error({
        message: '您的网络发生异常，无法连接服务器！' , 
        description: '网络异常'
      })
  }

}



export const request: RequestConfig = {
  //prefix:'http://localhost:8080/',
  credentials:'include',
  requestInterceptors: [ headerInterceptor ],
  errorHandler: errorHandler
};
