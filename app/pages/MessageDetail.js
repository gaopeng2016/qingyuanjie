/**
 *
 * @author keyy/1501718947@qq.com 16/11/10 16:09
 * @description
 */
import React, {Component} from 'react'
import {
  View,
  StyleSheet,
  Text,
  DeviceEventEmitter,
  TouchableOpacity,
  InteractionManager,
  Keyboard
} from 'react-native'
import {connect} from 'react-redux'
import BaseComponent from '../base/BaseComponent'
import {GiftedChat, Actions, Bubble, Avatar} from 'react-native-gifted-chat'
import CustomView from '../components/CustomView'
import {URL_DEV, TIME_OUT, URL_WS_DEV} from '../constants/Constant'
import * as Storage from '../utils/Storage'
import tmpGlobal from '../utils/TmpVairables'
import {strToDateTime, dateFormat} from '../utils/DateUtil'
import CustomMessage from '../components/CustomMessage'
import * as HomeActions from '../actions/Home'
import ActionSheet from 'react-native-actionsheet'
import CustomGiftedAvatar from '../components/CustomGiftAvatar'
import UserInfo from '../pages/UserInfo'
import CustomBubble from '../components/CustomBubble'

const styles = StyleSheet.create({
  footerContainer: {
    marginTop: 5,
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#aaa',
  },
  container: {
    height: 44,
    justifyContent: 'flex-end',
  },
  text: {
    color: '#0084ff',
    fontWeight: '600',
    fontSize: 17,
    backgroundColor: 'transparent',
    marginBottom: 12,
    marginLeft: 10,
    marginRight: 10,
  },
});

const CANCEL_INDEX = 0;
const DESTRUCTIVE_INDEX = 1;
let navigator;

class MessageDetail extends BaseComponent {

  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      loadEarlier: false,//关闭加载历史记录功能
      destroyed: true,
      typingText: '',
      isLoadingEarlier: false,
      AmIFollowedHim: false,
      ...this.props.route.params,
      targetUser: null
    };
    navigator = this.props.navigator;

    this.onSend = this.onSend.bind(this);
    this.onReceive = this.onReceive.bind(this);
    this.renderCustomActions = this.renderCustomActions.bind(this);
    this.renderBubble = this.renderBubble.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.onLoadEarlier = this.onLoadEarlier.bind(this);
    this.renderSend = this.renderSend.bind(this);
    this.renderMessage = this.renderMessage.bind(this);
    this.renderTime = this.renderTime.bind(this);
    this._goUserInfo = this._goUserInfo.bind(this);
    this.renderAvatar = this.renderAvatar.bind(this);
  }

  _initOldMessage() {
    Storage.getItem(`${this.state.myUserId}_MsgList`).then((res)=> {
      if (res !== null && this._getChatRecord(res) && this._getChatRecord(res).MsgList.length > 0) {
        console.log('MessageDetail加载缓存', res);
        this.setState({
          messages: this._getChatRecord(res).MsgList.reverse()
        }, ()=> {
          this._getNewMsg();
        });
      } else {
        console.log(res, this.state.myUserId, this.state.UserId);
        console.log('没有聊天记录');
        this._getNewMsg();
      }
    });
  }

  //从缓存中找出当前用户与聊天对象用户之间的聊天记录
  _getChatRecord(data) {
    console.log(data);
    return data.find((item)=> {
      return item.SenderId === this.state.UserId
    });
  }

  componentWillMount() {
    InteractionManager.runAfterInteractions(()=> {
      this._getUserInfo();
    });
  }

  componentDidMount() {
    this.setState({
      destroyed: false
    }, ()=> {
      this._initOldMessage();
    });
    this._attentionListener=DeviceEventEmitter.addListener('hasAttention',()=>{
      this._getUserInfo()
    });
  }

  _getUserInfo() {
    const {dispatch}=this.props;
    let params = {
      UserId: this.state.UserId,
      ...this.state.myLocation
    };
    dispatch(HomeActions.getUserInfo(params, (json)=> {
      this.setState({
        AmIFollowedHim: json.Result.AmIFollowedHim,
        targetUser: json.Result
      });
    }, (error)=> {
    }));
  }

  _getNewMsg() {
    tmpGlobal.proxy.on('getNewMsg', (obj) => {
      tmpGlobal.proxy.invoke('userReadMsg', obj.LastMsgId);
      //离开此页面后,不在此页面缓存消息,也不在此页面将消息标为已读
      if (!this.state.destroyed) {

        console.log('MessageDetail页面成功标为已读');
        console.log('MessageDetail页面开始缓存消息');
        this._receiveSaveRecord(JSON.parse(JSON.stringify(obj.MsgPackage)));
      }
      let resMsg = this._getSingleMsg(JSON.parse(JSON.stringify(obj.MsgPackage)), this.state.UserId);
      //页面销毁后,不在此页面接收消息。对方没有发消息过来,但别人发消息过来后,此页面也不会接收消息(如果对方在极短的时间内发了多条,就循环接收)
      if (resMsg && resMsg.MsgList && resMsg.MsgList.length > 0 && !this.state.destroyed) {
        console.log(obj);
        console.log('MessageDetail页面收到了新消息');
        for (let i = 0; i < resMsg.MsgList.length; i++) {
          this.onReceive(resMsg.MsgList[i]);
        }
      }
    });
  }

  //从服务器返回的消息列表中筛选出与当前用户聊天的对象的消息
  _getSingleMsg(data, id) {
    let newMsgList = JSON.parse(JSON.stringify(data));
    for (let i = 0; i < newMsgList.length; i++) {
      for (let j = 0; j < newMsgList[i].MsgList.length; j++) {
        newMsgList[i].MsgList[j] = {
          HasSend: true,
          MsgContent: newMsgList[i].MsgList[j].MsgContent,
          MsgId: newMsgList[i].MsgList[j].MsgId,
          SendTime: this._renderMsgTime(newMsgList[i].MsgList[j].SendTime),
          _id: Math.round(Math.random() * 1000000),
          text: newMsgList[i].MsgList[j].MsgContent,
          createdAt: this._renderMsgTime(newMsgList[i].MsgList[j].SendTime),
          user: {
            _id: newMsgList[i].SenderId,
            name: newMsgList[i].SenderNickname,
            avatar: newMsgList[i].SenderAvatar,
            myUserId: this.state.myUserId
          }
        };
      }
    }
    return newMsgList.find((item)=> {
      return item.SenderId === id;
    });
  }

  _renderMsgTime(str) {
    if (str.indexOf('T') > -1) {
      return str.split('T')[0] + ' ' + (str.split('T')[1]).split('.')[0];
    } else {
      return str;
    }
  }

  //接收时缓存(同时需要发布缓存成功的订阅,供Message页面监听)
  _receiveSaveRecord(data) {
    console.log('这是从服务器返回的消息', data);
    let newMsgList = [];
    let dataCopy = [];
    newMsgList = JSON.parse(JSON.stringify(data));
    for (let i = 0; i < newMsgList.length; i++) {
      for (let j = 0; j < newMsgList[i].MsgList.length; j++) {
        newMsgList[i].MsgList[j] = {
          MsgContent: newMsgList[i].MsgList[j].MsgContent,
          MsgId: newMsgList[i].MsgList[j].MsgId,
          HasSend: true,
          SendTime: this._renderMsgTime(newMsgList[i].MsgList[j].SendTime),
          _id: Math.round(Math.random() * 1000000),
          text: newMsgList[i].MsgList[j].MsgContent,
          createdAt: this._renderMsgTime(newMsgList[i].MsgList[j].SendTime),
          user: {
            _id: newMsgList[i].SenderId,
            name: newMsgList[i].SenderNickname,
            avatar: URL_DEV + newMsgList[i].SenderAvatar,
            myUserId: this.state.myUserId
          }
        };
      }
    }
    dataCopy = JSON.parse(JSON.stringify(newMsgList));
    console.log('待缓存的数据', dataCopy);
    Storage.getItem(`${this.state.myUserId}_MsgList`).then((res)=> {
      if (res !== null && res.length > 0) {
        for (let i = 0; i < res.length; i++) {
          for (let j = 0; j < data.length; j++) {
            if (res[i].SenderId === data[j].SenderId) {
              res[i].MsgList = res[i].MsgList.concat(dataCopy[j].MsgList);
              newMsgList.splice(j, 1);
            }
          }
        }
        res = res.concat(newMsgList);
        console.log('已有缓存时,待缓存的数据', res);
        Storage.setItem(`${this.state.myUserId}_MsgList`, res).then(()=> {
          DeviceEventEmitter.emit('MessageCached', {data: res, message: '消息缓存成功'});
        });
      } else {
        //没有历史记录,且服务器第一次推送消息
        Storage.setItem(`${this.state.myUserId}_MsgList`, dataCopy).then(()=> {
          DeviceEventEmitter.emit('MessageCached', {data: res, message: '消息缓存成功'});
        });
      }
    });
  }

  //发送时缓存(同时需要发布订阅,供Message页面监听)
  _sendSaveRecord(data) {
    //跟当前用户没有聊天记录
    let allMsg = {
      SenderAvatar: this.state.UserAvatar,
      SenderId: this.state.UserId,
      SenderNickname: this.state.Nickname,
      MsgList: [data]
    };
    Storage.getItem(`${this.state.myUserId}_MsgList`).then((res)=> {
      if (res !== null && res.length > 0) {
        let index = res.findIndex((item)=> {
          return item.SenderId === this.state.UserId
        });
        if (index > -1) {
          res[index].MsgList.push(data);
        } else {
          res.push(allMsg);
        }
        console.log('发送时更新消息缓存数据', res, data);
        Storage.setItem(`${this.state.myUserId}_MsgList`, res).then(()=> {
          DeviceEventEmitter.emit('MessageCached', {data: res, message: '消息缓存成功'});
        });
      } else {
        Storage.setItem(`${this.state.myUserId}_MsgList`, [allMsg]).then(()=> {
          DeviceEventEmitter.emit('MessageCached', {data: [allMsg], message: '消息缓存成功'});
        });
      }
    });
  }

  //页面销毁之前,切换销毁开关,离开此页面后,不再接收消息
  componentWillUnmount() {
    this.state.destroyed = true;
    this._attentionListener.remove();
  }

  onLoadEarlier() {
    console.log('点击了加载历史记录');
  }

  //发消息的同时,将消息缓存在本地
  onSend(messages) {
    Keyboard.dismiss();
    console.log(messages);
    let singleMsg = {
      MsgContent: messages[0].text,
      MsgId: Math.round(Math.random() * 1000000),
      SendTime: messages[0].createdAt,
      HasSend: true,
      _id: Math.round(Math.random() * 1000000),
      text: messages[0].text,
      createdAt: messages[0].createdAt,
      user: {
        _id: this.state.myUserId,
        name: tmpGlobal.currentUser.Nickname,
        avatar: URL_DEV + tmpGlobal.currentUser.PhotoUrl
      },
    };

    //单条发送的消息存入缓存中时,需要将日期转成字符串存储
    let params = {
      MsgContent: messages[0].text,
      MsgId: Math.round(Math.random() * 1000000),
      SendTime: dateFormat(messages[0].createdAt),
      HasSend: true,
      _id: Math.round(Math.random() * 1000000),
      text: messages[0].text,
      createdAt: dateFormat(messages[0].createdAt),
      user: {
        _id: this.state.myUserId,
        name: tmpGlobal.currentUser.Nickname,
        avatar: URL_DEV + tmpGlobal.currentUser.PhotoUrl
      },
    };
    console.log(params);
    this._sendSaveRecord(params);

    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, singleMsg),
      };
    });

    tmpGlobal.proxy.invoke('userSendMsgToUser', this.state.UserId, messages[0].text);
  }

  onReceive(data) {
    console.log('onReceive渲染方法', data);
    this.setState((previousState) => {
      return {
        messages: GiftedChat.append(previousState.messages, {
          MsgContent: data.text,
          MsgId: data.id,
          HasSend: true,
          _id: data._id,
          text: data.text,
          SendTime: data.createdAt,
          createdAt: strToDateTime(data.createdAt),//从服务器接收的是字符串类型的时间,这里只支持Date类型,存入缓存之前,需要转成字符串时间
          user: {
            _id: data.user._id,
            name: data.user.name,
            avatar: URL_DEV + data.user.avatar
          },
        }),
      };
    });
  }

  renderCustomActions(props) {
    const options = {
      'Action 1': (props) => {
        alert('option 1');
      },
      'Action 2': (props) => {
        alert('option 2');
      },
      'Cancel': () => {
      },
    };
    return (
      <Actions
        {...props}
        options={options}
      />
    );
  }

  renderBubble(props) {
    return (
      <CustomBubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: '#f0f0f0',
            paddingHorizontal: 6,
            paddingVertical: 6
          },
          right: {
            paddingHorizontal: 6,
            paddingVertical: 6
          }
        }}
      />
    );
  }

  renderCustomView(props) {
    return (
      <CustomView
        {...props}
      />
    );
  }

  renderFooter(props) {
    if (this.state.typingText) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {this.state.typingText}
          </Text>
        </View>
      );
    }
    return null;
  }

  renderSend(props) {
    if (props.text.trim().length > 0) {
      return (
        <TouchableOpacity
          style={[styles.container, this.props.containerStyle]}
          onPress={() => {
            props.onSend({text: props.text.trim()}, true);
          }}>
          <Text style={[styles.text, props.textStyle]}>{props.label}</Text>
        </TouchableOpacity>
      );
    }
    return <View/>;
  }

  renderMessage(props) {
    return (
      <CustomMessage {...props}/>
    )
  }

  renderTime() {
    return null
  }

  renderAvatar(props) {
    //console.log(props);
    return (
      <CustomGiftedAvatar
        {...props}
        onPress={this._goUserInfo}/>
    )
  }

  getNavigationBarProps() {
    return {
      title: `${this.state.Nickname}`,
      hideRightButton: false,
      rightIcon: {
        name: 'ellipsis-v'
      },
    };
  }

  onRightPressed() {
    this.ActionSheet.show();
  }

  //关注/取消关注
  _actionSheetPress(index) {
    const {dispatch}=this.props;
    let data = {
      attentionUserId: this.state.UserId
    };
    if (index === 1) {
      dispatch(HomeActions.attention(data, (json)=> {
        DeviceEventEmitter.emit('hasAttention','已关注/取消关注对方');
      }, (error)=> {
      }));
    }
  }

  _initButtons(data) {
    if (data) {
      return ['取消', '取消关注'];
    } else {
      return ['取消', '关注TA'];
    }
  }

  _goUserInfo(props) {
    if (this._getPreviousRoute() === 'UserInfo' && props.currentMessage.user._id !== this.state.myUserId) {
      navigator.pop();
    } else {
      const {dispatch}=this.props;
      let params = {
        UserId: props.currentMessage.user._id,
        ...tmpGlobal.currentLocation
      };
      dispatch(HomeActions.getUserInfo(params, (json)=> {
        dispatch(HomeActions.getUserPhotos({UserId: props.currentMessage.user._id}, (result)=> {
          navigator.push({
            component: UserInfo,
            name: 'UserInfo',
            params: {
              Nickname: props.currentMessage.user.name,
              UserId: props.currentMessage.user._id,
              myUserId: this.state.myUserId,
              ...json.Result,
              userPhotos: result.Result,
              myLocation: tmpGlobal.currentLocation,
              isSelf: props.currentMessage.user._id === tmpGlobal.currentUser.UserId
            }
          });
        }, (error)=> {
        }));
      }, (error)=> {
      }));
    }
  }

  _getPreviousRoute() {
    let routes = navigator.getCurrentRoutes();
    return routes[routes.length - 2].name;
  }

  renderBody() {
    return (
      <View style={{flex: 1}}>
        <GiftedChat
          messages={this.state.messages}
          onSend={this.onSend}
          loadEarlier={this.state.loadEarlier}
          onLoadEarlier={this.onLoadEarlier}
          isLoadingEarlier={this.state.isLoadingEarlier}
          user={{
            _id: this.state.myUserId, // sent messages should have same user._id
            name: tmpGlobal.currentUser.Nickname,
            avatar: URL_DEV + tmpGlobal.currentUser.PhotoUrl
          }}
          locale={'zh-cn'}
          label={'发送'}
          placeholder={'输入消息内容'}
          //renderActions={this.renderCustomActions}
          renderBubble={this.renderBubble}
          renderCustomView={this.renderCustomView}
          renderFooter={this.renderFooter}
          renderSend={this.renderSend}
          renderMessage={this.renderMessage}
          renderTime={this.renderTime}
          onPress={this._goUserInfo}
          renderAvatar={this.renderAvatar}
        />
        <ActionSheet
          ref={(o) => this.ActionSheet = o}
          title="请选择你的操作"
          options={this._initButtons(this.state.AmIFollowedHim)}
          cancelButtonIndex={CANCEL_INDEX}
          destructiveButtonIndex={DESTRUCTIVE_INDEX}
          onPress={this._actionSheetPress.bind(this)}
        />
      </View>
    )
  }

}

MessageDetail.childContextTypes = {
  getLocale: React.PropTypes.string.isRequired
};

export default connect((state)=> {
  return {
    ...state
  }
})(MessageDetail)
