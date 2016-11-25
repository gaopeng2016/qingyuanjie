/**
 *
 * @author keyy/1501718947@qq.com 16/11/15 14:28
 * @description
 */
import * as ActionTypes from './ActionTypes'
import {URL_DEV} from '../constants/Constant'
import {toastShort} from '../utils/ToastUtil'
import {Actions} from 'react-native-router-flux'
import {postFetch, getFetch} from '../utils/NetUtil'
import * as Storage from '../utils/Storage'

function fetchOptions(data) {
  return {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }
}

function fetchOptionsGet() {
  return {
    method: 'GET'
  }
}

export function getUserProfile() {
  return (dispatch)=> {
    dispatch(requestUserProfile());
    fetch(URL_DEV + '/profile', fetchOptionsGet())
      .then(response => response.json())
      .then(json => {
        dispatch(receiveUserProfile(json));
        if ('OK' !== json.Code) {
          toastShort(json.Message);
        } else {
          let str = json.Result.DatingPurpose + '';
          const params = {
            Nickname: json.Result.Nickname ? json.Result.Nickname + '' : '',
            Username: json.Result.Username ? json.Result.Username + '' : '',
            DatingPurpose: '',
            MapPrecision: json.Result.MapPrecision + '',
            IsFullyRegistered: json.Result.IsFullyRegistered,
            HasSavedUserProfile: !!json.Result.Nickname,
            BirthYear: json.Result.BirthYear ? json.Result.BirthYear + '' : '',
            HasSavedBirthYear: !!json.Result.BirthYear,
            Ethnicity: json.Result.Ethnicity ? json.Result.Ethnicity + '' : '',
            HasSavedEthnicity: !!json.Result.Ethnicity,
            Gender: 'undefined' == typeof json.Result.Gender || json.Result.Gender == true ? '1' : '0',
            HasSavedGender: !!json.Result.Gender,
            Height: json.Result.Height ? json.Result.Height + '' : '',
            HasSavedHeight: !!json.Result.Height,
            Weight: json.Result.Weight ? json.Result.Weight + '' : '',
            MobileNo: json.Result.MobileNo || null,
            Love: str.indexOf('Love') > -1,
            Relationship: str.indexOf('Relationship') > -1,
            Friendship: str.indexOf('Friendship') > -1,
            Others: str.indexOf('Others') > -1
          };
          Actions.userProfile({param: params});
        }
      }).catch((err)=> {
      dispatch(receiveUserProfile(err));
      toastShort('网络发生错误,请重试')
    })
  };
}

function requestUserProfile() {
  return {
    type: ActionTypes.FETCH_USER_PROFILE
  }
}

function receiveUserProfile(json) {
  return {
    type: ActionTypes.RECEIVE_USER_PROFILE,
    json
  }
}

function getSelectedValue(data) {
  let JobTypeObj, IncomeLevel, EducationLevel, MarriageStatus;
  const selectedValue = async(data)=> {
    let jobTypeArr = await Storage.getItem('JobTypeDict');
    let incomeLevelArr = await Storage.getItem('IncomeLevelDict');
    let educationLevelArr = await Storage.getItem('EducationLevelDict');
    let marriageStatusArr = await Storage.getItem('MarriageStatusDict');

    JobTypeObj = jobTypeArr.find((item)=> {
      return item.Value == data.professionText;
    });
    IncomeLevel = incomeLevelArr.find((item)=> {
      return item.Value == data.incomeText;
    });
    EducationLevel = educationLevelArr.find((item)=> {
      return item.Value == data.educationStatusText;
    });
    MarriageStatus = marriageStatusArr.find((item)=> {
      return item.Value == data.emotionStatusText;
    });
    console.log(JobTypeObj, IncomeLevel, EducationLevel, MarriageStatus);
  };
  selectedValue(data);
  console.log(JobTypeObj, IncomeLevel, EducationLevel, MarriageStatus);
  return {JobTypeObj, IncomeLevel, EducationLevel, MarriageStatus};
}


export function saveProfile(data, resolve, reject) {
  console.log(data);
  //console.log(getSelectedValue(data));

  let params = {
    Nickname: data.nickName,
    BirthDate: data.birthYearText,
    Ethnicity: data.ethnicity,
    Gender: data.gender,
    Height: data.height,
    Weight: data.weight,
    //JobType: JobTypeObj.Key,
    //IncomeLevel:IncomeLevel.Key,
    //EducationLevel: EducationLevel.Key,
    //MarriageStatus: MarriageStatus.Key,
    Religion: data.religion,
    DatingPurpose: data.datingPurpose,
    MapPrecision: data.mapPrecision,
    Hometown: data.hometown
  };

  console.log(params);
  return (dispatch)=> {
    postFetch('/profile', params, dispatch, {type: ActionTypes.FETCH_BEGIN}, {type: ActionTypes.FETCH_END}, {type: ActionTypes.FETCH_FAILED}, resolve, reject);
  }
}

export function saveUserProfile(data) {
  //这里对参数做处理
  let tmpArr = [];
  if (data.Love) {
    tmpArr.push('Love');
  }
  if (data.Relationship) {
    tmpArr.push('Relationship');
  }
  if (data.Friendship) {
    tmpArr.push('Friendship');
  }
  if (data.Others) {
    tmpArr.push('Others');
  }

  const params = {
    Nickname: data.Nickname,
    IsFullyRegistered: true,
    Ethnicity: data.Ethnicity || null,
    MobileNo: data.MobileNo,
    BirthYear: data.BirthYear ? parseInt(data.BirthYear) : null,
    Gender: data.Gender == '1',
    Height: data.Height ? parseInt(data.Height) : null,
    Weight: data.Weight ? parseInt(data.Weight) : null,
    DatingPurpose: tmpArr.length > 0 ? tmpArr.join(",") : null,
    MapPrecision: parseInt(data.MapPrecision),
    PhotoUrl: null
  };

  return (dispatch)=> {
    //这里对交友目的做处理
    dispatch(requestSaveUserProfile(params));
    fetch(URL_DEV + '/profile', fetchOptions(params))
      .then(response => response.json())
      .then(json => {
        dispatch(receiveSaveUserProfile(params, json));
        if ('OK' !== json.Code) {
          toastShort(json.Message);
        } else {
          Actions.photos({new: true});
        }
      }).catch((err)=> {
      dispatch(receiveSaveUserProfile(params, err));
      toastShort('网络发生错误,请重试')
    })
  };
}

function requestSaveUserProfile(data) {
  return {
    type: ActionTypes.FETCH_SAVE_USER_PROFILE,
    data
  }
}

function receiveSaveUserProfile(data, json) {
  return {
    type: ActionTypes.RECEIVE_SAVE_USER_PROFILE,
    data,
    json
  }
}