/**
 * 创建临时全局变量
 * @author keyy/1501718947@qq.com 16/12/10 13:18
 * @description
 */

let tmpGlobal = {
  proxy:null,
  currentLocation:null,
  currentUser:null,
  connection:null,
  _initWebSocket:null,
  isConnected:true//全局保存网络状态
};

export default tmpGlobal