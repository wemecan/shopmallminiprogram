// pages/scan-qrcode/scan-qrcode.js
var app = getApp();
var bmap = require('../../utils/bmap-wx.min.js');
var wxMarkerData = []; 

Page({

  /**
   * 页面的初始数据
   */
  data: {
    markers: [],
    latitude: '',
    longitude: '',
    rgcData: {},
    owner_flag:0,  //订单管理者标记，0 不是订单所有者 1 订单所有者 2 订单所有者要发短信
    display: ''
  },
  makertap: function (e) {
    var that = this;
    var id = e.markerId;
    that.showSearchInfo(wxMarkerData, id);
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    var that = this;
    // this.getMap();

    var q = options.q;
    var orderno = null;

    //q = 'http%3A%2F%2Fjh.tseo.cn%2Findex.php%3Fg%3DHome%26m%3DScan%26a%3Dindex%26orderno%3D20190315104009EAPWAP';

    that.setData({
      q: q,
      is_send_mess: false
    })

   
    console.log(options);

    if (typeof (q) != 'undefined') {
      console.log('获取到带参二维码参数q：' + q);
      q = decodeURIComponent(q);
      console.log('decodeURI转码后的q：' + q);

      orderno = q.replace('http://jh.tseo.cn/index.php?g=Home&m=Scan&a=index&orderno=', '');
      if (orderno.length > 20) {
        orderno = orderno.replace('http%3A%2F%2Fjh.tseo.cn%2Findex.php%3Fg%3DHome%26m%3DScan%26a%3Dindex%26orderno%3D', '');
      }

      console.log('从q参数得到的 orderno：' + orderno);
      that.setData({
        orderno: orderno
      })

      that.__wx_login(that, orderno)
     

     
    }

  },


//获取订单详情
  __wx_login: function (that, orderno){
  

  var current_openid = app.get_current_openid();
  if(current_openid){
    that.__get_order_detail(that, orderno, current_openid);

    return;
  }

  wx.login({
    success: function (wxlogin_res) {
      console.log("btn_one_click_login 获取到的jscode是:" + wxlogin_res.code);

      wx.request({
        url: app.globalData.http_server + '?g=Yanyubao&m=ShopAppWxa&a=wxa_get_openid_using_js_code',
        header: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        dataType: 'json',
        data: {
          js_code: wxlogin_res.code,
          xiaochengxu_appid: app.globalData.xiaochengxu_appid,
          sellerid: app.get_sellerid(),
        },
        success: function (http_res) {
          

          if (http_res && http_res.data) {
            if (http_res.data.code == 1) {
              var openid = http_res.data.openid;
              app.set_current_openid(openid);

              that.__get_order_detail(that, orderno, openid);
            }
            else {
              wx.showModal({
                title: '提示',
                content: http_res.data.msg,
                showCancel: false,
                success(res) {
                  if (res.confirm) {
                    console.log('用户点击确定')
                  }
                }
              })
            }

          }
          else {
            wx.showToast({
              title: '网络解密异常！',
              duration: 2000
            });
          }


        }
      });

    },
    fail: function (login_res) {
      console.log('login.js  wx.login失败。');

      wx.showToast({
        title: '打开小程序登录异常',
        duration: 2000
      });
    }
  })



  
},

  __get_order_detail: function (that, orderno, openid){

  //请求延誉宝接口，根据订单编号和openid、appid得到订单的详细信息
  wx.request({
    url: app.globalData.http_server + 'index.php/openapi/Jianghanyinhua/order_detail_get',
    method: 'post',
    data: {
      orderno: orderno,
      openid : openid,
      sellerid: app.get_sellerid(),
      //xiaochengxu_appid: app.globalData.xiaochengxu_appid
    },
    header: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    success: function (res) {
      console.log('order_detail_get', res)

      var data = res.data.data;
      if (!res.data.data) {
        return;
      }

      var mobile = data.mobile;

      //app.globalData.userInfo.user_openid = data.openid;

      //但是订单的手机号为空，则跳转到绑定手机号码的page
      // that.data.owner_flag =1 
      if (!mobile) {
        console.log('mobile', mobile);

        wx.navigateTo({
          url: '/pages/scan_qrcode/scan_bind_mobile?orderno=' + orderno,
        })

        return;
      }

      //请求成功，

      //当前手机号存在，如果当前openid和订单的openid一致，跳出两个选择，更换手机号码和扫码定位
      // this.data.owner_flag =1 

      //如果不是以上两种情况，this.data.owner_flag =2 

      console.log('ddddd', data.openid);
      // app.get_current_openid()

      if (data.openid == app.get_current_openid()) {

        console.log('!mobile&&888888')


        that.setData({
          owner_flag: 1,
          mobile: mobile,
          display: "block"
        })

      } else {
        that.setData({
          owner_flag: 2
        })
      }
    },
    fail: function (e) {
      wx.showToast({
        title: '网络异常！',
        duration: 2000
      });
    },
  });

},




  getMap:function(){
    var that = this;


    var regeocoding_fail = function (data) {
      console.log('fail', data)
      wx.chooseLocation({
        success: function (e) {
          //已打开定位
          that.setData({
            showCon: false
          })
        },
        fail: () => {
          //没有打开定位
          wx.getSetting({
            success: (res) => {
              if (!res.authSetting['scope.userLocation']) {
                //打开提示框，提示前往设置页面
                that.setData({
                  showCon: true
                })
              }

            }
          })
        }
      })
    };

    var regeocoding_success_get_location = function (data) {
      console.log('success', data)
      wxMarkerData = data.wxMarkerData;
      that.setData({
        markers: wxMarkerData
      });



      if (wxMarkerData[0].latitude == 0 || wxMarkerData[0].longitude == 0) {
        wx.getLocation({
          type: 'wgs84',
          success(res) {
            wxMarkerData[0].latitude = res.latitude;
            wxMarkerData[0].longitude = res.longitude;
            wx.request({
              url: 'https://api.map.baidu.com/geocoder/v2/?location=' + res.latitude + ',' + res.longitude + '&coordtype=wgs84ll&output=json&pois=1&latest_admin=1&ak=Sj9XVcaHMrKfaXZ2VmZhUqd03wpr0SAK',
              method: 'get',

              header: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              success: function (res) {
                console.log('sssssssssss', res);

                wxMarkerData[0].address = res.data.result.formatted_address;


                that.setData({
                  latitude: wxMarkerData[0].latitude,
                  longitude: wxMarkerData[0].longitude
                });


                console.log('llllllllaaaaaaaaaaaaa', wxMarkerData)


                if (!that.data.is_send_mess && that.data.owner_flag == 2) {
                  that.send_location_sms();
                }

                return;

              },
              fail: function (res) {

                return;

              }
            })


          }
        })



      }


      that.setData({
        latitude: wxMarkerData[0].latitude,
        longitude: wxMarkerData[0].longitude
      });



      console.log('llllllll', wxMarkerData)

      //如果是订单所有者
      // if(that.data.owner_flag == 1){
      //   return;
      // }


      // //yixai function
      // if (that.data.owner_flag == 0) {
      //   return;
      // }


      if (!that.data.is_send_mess && that.data.owner_flag == 2) {
        that.send_location_sms();
      }




    }


    app.set_option_list_str(that, function (that, cb_params) {
      //var that = this;

      console.log('getShopOptionAndRefresh+++++:::' + cb_params)

      //从本地读取
      var option_list_str = wx.getStorageSync("option_list_str");
      var option_list = JSON.parse(option_list_str);

      console.log("获取商城选项数据：" + option_list_str + '用于百度地图');
      console.log("百度地图AK：" + option_list.baidu_map_ak_wxa);

      /* 获取定位地理位置 */
      // 新建bmap对象

      // 新建百度地图对象 
      var BMap = new bmap.BMapWX({
        ak: option_list.baidu_map_ak_wxa
      });

      // 发起regeocoding检索请求 
      BMap.regeocoding({
        fail: regeocoding_fail,
        success: regeocoding_success_get_location,
        iconPath: '../../images/marker_red.png',
        iconTapPath: '../../images/marker_red.png'
      }); 

    });


    
    //不允许data

  },

  showSearchInfo: function (data, i) {
    var that = this;
    that.setData({
      rgcData: {
        address: '地址：' + data[i].address + '\n',
        desc: '描述：' + data[i].desc + '\n',
        business: '商圈：' + data[i].business
      }
    });
  },


//更换手机号
  change_mobile_num:function(){
    var that = this;
    wx.navigateTo({
      url: '/pages/scan_qrcode/scan_change_mobile?orderno=' + that.data.orderno + '&mobile=' + that.data.mobile,
    })
  },

  //重置手机号码
  scan_remove_mobile:function(){
    var that = this;

    wx.request({
      url: app.globalData.http_server + 'index.php/openapi/Jianghanyinhua/remove_mobile_phone',
      header: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST",
      data: {
        openid: app.get_current_openid(),
        appid: app.globalData.xiaochengxu_appid,        
        orderno: that.data.orderno,
        sellerid: app.get_sellerid()
      },
      success: function (res) {
        console.log('res', res)

        wx.showModal({
          title: '提示',
          content: res.data.msg,
          showCancel: false,
          success: function (res2) {
            wx.switchTab({
              url: '/pages/index/index',
            })
          }
        })

      }
    });

  },

//扫码定位
  scan_location:function(){
    var that = this;
    that.send_location_sms();
  },


  send_location_sms:function(data){
    var that = this;
    console.log('dddd');

    if ((wxMarkerData[0].latitude == 0) || (wxMarkerData[0].longitude == 0)){
      return;
    }
    
          wx.request({
            url: app.globalData.http_server + 'index.php/openapi/Jianghanyinhua/mapaddress',
            method: 'post',
            data: {
              orderno: that.data.orderno,
              latitude: wxMarkerData[0].latitude,
              longitude: wxMarkerData[0].longitude,
              address: wxMarkerData[0].address,
              q: that.data.q,
            },
            header: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            success: function (res) {
              console.log('ooooo',res)
              wx.navigateTo({
                url: '/pages/welcome_page/welcome_page',
              })
            that.setData({
              is_send_mess: true
            })

            },
            fail: function (e) {
              wx.showToast({
                title: '网络异常！',
                duration: 2000
              });
            },
          });

      
  },

  

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    var that = this;
      that.getMap();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
        
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})