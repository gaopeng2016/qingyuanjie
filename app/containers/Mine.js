/**
 *
 * @author keyy/1501718947@qq.com 16/11/10 09:54
 * @description
 */
import React, {Component} from 'react'
import {
  StyleSheet,
  Text,
  View,
  InteractionManager,
  Image,
  TouchableOpacity,
  DeviceEventEmitter,
  Dimensions,
  ScrollView
} from 'react-native'
import BaseComponent from '../base/BaseComponent'
import Icon from 'react-native-vector-icons/FontAwesome'
import {URL_DEV, TIME_OUT} from '../constants/Constant'
import Spinner from '../components/Spinner'
import EditPersonalSignature from '../pages/EditPersonalSignature'
import UserInfo from '../pages/UserInfo'
import {connect} from 'react-redux'
import * as HomeActions from '../actions/Home'
import tmpGlobal from '../utils/TmpVairables'
import Settings from '../pages/Settings'
import * as Storage from '../utils/Storage'

const {height, width} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E2E2E2'
  },
  avatarArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderColor: 'gray'
  },
  userAvatar: {
    height: width / 3,
    width: width / 3,
    borderRadius: width / 6,
    marginBottom: 20
  },
  avatarText: {
    color: '#fff',
    marginHorizontal: 5
  },
  userAvatarLabel: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderColor: 'gray',
    paddingVertical: 0.5,
    flex: 1
  },
  touchableItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  listItemIcon: {
    width: 80,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listItemLeft: {
    flex: 1,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems:'center'
  },
  itemIcon: {
    marginRight: 10
  }
});

let navigator;

class Mine extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      pending: false,
      loadUserInfo: true,
      myLocation: tmpGlobal.currentLocation,
      ...tmpGlobal.currentUser
    };
    navigator = this.props.navigator;
  }

  getNavigationBarProps() {
    return {
      title: '我的',
      hideLeftButton: true
    };
  }

  componentDidMount() {
    this.subscription = DeviceEventEmitter.addListener('photoChanged', ()=> {
      this._getCurrentUserInfo()
    });
    this.userProfileListener = DeviceEventEmitter.addListener('userInfoChanged', ()=> {
      this._getCurrentUserInfo()
    });
    this.signatureListener = DeviceEventEmitter.addListener('signatureChanged', (data)=> {
      this._updateSignature(data)
    });

  }

  componentWillUnmount() {
    this.subscription.remove();
    this.signatureListener.remove();
    this.userProfileListener.remove();
  }

  _getCurrentUserInfo() {
    this.setState({pending: true});
    const {dispatch}=this.props;
    dispatch(HomeActions.getCurrentUserProfile('', (json)=> {
      tmpGlobal.currentUser = json.Result;
      this.setState({
        ...json.Result,
        pending: false,
        myLocation: tmpGlobal.currentLocation,
        loadUserInfo: true,
      });
      Storage.setItem('userInfo', json.Result);
    }, (error)=> {
    }));
  }

  //编辑签名
  _editSignature(data) {
    navigator.push({
      component: EditPersonalSignature,
      name: 'EditPersonalSignature',
      params: {
        personalSignature: data
      },
    });
  }

  //刷新签名
  _updateSignature(data) {
    this.setState({
      PersonSignal: data.data
    })
  }

  //前往查看我的详细资料(需要先获取我的相册)
  _editMyDetail(data) {
    const {dispatch}=this.props;
    let params = {
      UserId: data.UserId,
      ...data.myLocation
    };
    dispatch(HomeActions.getUserInfo(params, (json)=> {
      dispatch(HomeActions.getUserPhotos({UserId: data.UserId}, (result)=> {
        navigator.push({
          component: UserInfo,
          name: 'UserInfo',
          params: {
            Nickname: data.Nickname,
            UserId: data.UserId,
            myUserId: data.UserId,//这里的myUserId跟this.state.UserId相等,因为是当前用户
            ...json.Result,
            userPhotos: result.Result,
            myLocation: this.state.myLocation,
            isSelf: true//从我的页面进入用户详情,那么一定是当前用户
          }
        });
      }, (error)=> {
      }))
    }, (error)=> {
    }));
  }

  //前往设置页
  _goSettings() {
    navigator.push({
      component: Settings,
      name: 'Settings'
    })
  }

  _renderLocation(data) {
    if (data !== null) {
      return (
        <Text style={styles.avatarText}>{data}</Text>
      )
    } else {
      return null;
    }
  }

  _renderGenderStyle(gender) {
    return {
      backgroundColor: gender ? '#1496ea' : 'pink',
      borderColor: gender ? '#1496ea' : 'pink',
    }
  }

  renderBody() {
    if (this.state.loadUserInfo) {
      return (
        <View style={styles.container}>
          <ScrollView>
            <View style={styles.avatarArea}>
              <Image
                style={styles.userAvatar}
                source={{uri: URL_DEV + this.state.PhotoUrl}}/>
              <Text>{this.state.Nickname}</Text>
              <View style={[styles.userAvatarLabel, this._renderGenderStyle(this.state.Gender)]}>
                <Icon
                  style={styles.avatarText}
                  name={this.state.Gender ? 'mars-stroke' : 'venus'}
                  size={14}/>
                <Text style={styles.avatarText}>{this.state.Age}</Text>
                {this._renderLocation(this.state.Location)}
              </View>
            </View>
            <View style={styles.listItem}>
              <Text
                style={styles.listItemLeft}>{this.state.PersonSignal ? this.state.PersonSignal : '请点击右侧按钮编辑你的个性签名'}</Text>
              <TouchableOpacity
                onPress={()=> {
                  this._editSignature(this.state.PersonSignal)
                }}
                style={styles.listItemIcon}
                activeOpacity={0.5}>
                <Icon name={'edit'} size={20}/>
              </TouchableOpacity>
            </View>
            <View style={styles.listItem}>
              <TouchableOpacity
                onPress={()=> {
                  this._editMyDetail(this.state)
                }}
                style={styles.touchableItem}>
                <View style={styles.listItemLeft}>
                  <Icon
                    style={styles.itemIcon}
                    name={'list-alt'}
                    size={18}/>
                  <Text>{'详细资料'}</Text>
                </View>
                <View style={styles.listItemIcon}>
                  <Icon name={'angle-right'} size={20}/>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.listItem}>
              <TouchableOpacity
                onPress={()=> {
                  this._goSettings()
                }}
                style={styles.touchableItem}>
                <View style={styles.listItemLeft}>
                  <Icon
                    style={styles.itemIcon}
                    name={'gear'}
                    size={18}/>
                  <Text>{'设置'}</Text>
                </View>
                <View style={styles.listItemIcon}>
                  <Icon name={'angle-right'} size={20}/>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )
    } else {
      return null
    }
  }

  renderSpinner() {
    if (this.state.pending) {
      return (
        <Spinner animating={this.state.pending}/>
      )
    }
  }
}

export default connect((state)=> {
  return {
    ...state
  }
})(Mine)