// 时间戳转换器插件预加载脚本
// 使用 CommonJS 模块规范

const path = require('path');
const fs = require('fs');

// 检查平台API是否可用
console.log('预加载脚本开始执行');
console.log('window.platform 是否存在:', typeof window.platform);
if (window.platform) {
  console.log('可用的平台API方法:', Object.keys(window.platform));
} else {
  console.warn('window.platform 未找到，这可能导致功能异常');
}

// 处理插件进入事件的函数
function handlePluginEnter(action) {
  console.log('时间戳转换器插件被激活:', action);
  
  setTimeout(() => {
    const input = document.getElementById('timestampInput');
    const convertBtn = document.getElementById('convertBtn');
    
    if (!input || !convertBtn) return;
    
    // 状态清理机制 - 按照答辩文档标准方案实现
    function clearPreviousState() {
      try {
        // 清理输入验证状态
        input.style.borderColor = '#e0e6ed';
        
        // 清理错误提示
        const toast = document.getElementById('toast');
        if (toast) toast.classList.add('hidden');
        
        // 重置结果显示区域
        const resultElements = ['standardFormat', 'dateFormat', 'timeFormat'];
        resultElements.forEach(id => {
          const element = document.getElementById(id);
          if (element) element.textContent = '-';
        });
        
        console.log('插件状态已清理');
      } catch (error) {
        console.warn('清理状态时出错:', error);
      }
    }
    
    // 执行状态清理
    clearPreviousState();
    
    if (action.code === 'convert') {
      // 时间戳转换功能
      if (action.payload && /^\d{10,13}$/.test(action.payload)) {
        input.value = action.payload;
        convertBtn.click();
      }
    } else if (action.code === 'currentTime') {
      // 获取当前时间戳功能
      input.value = Date.now().toString();
      convertBtn.click();
    }
  }, 100);
}

// 注册插件进入事件监听
if (window.platform && typeof window.platform.onPluginEnter === 'function') {
  window.platform.onPluginEnter(handlePluginEnter);
  console.log('插件进入事件监听已注册');
} else {
  console.error('无法注册插件进入事件监听，window.platform.onPluginEnter 不可用');
}

// 为了防止错过启动时的 action，也要检查上一次的 action
window.addEventListener('DOMContentLoaded', () => {
  if (window.platform && typeof window.platform.getLastPluginEnterAction === 'function') {
    const lastAction = window.platform.getLastPluginEnterAction();
    if (lastAction) {
      console.log('处理上一次的插件进入事件:', lastAction);
      handlePluginEnter(lastAction);
    }
  } else {
    console.warn('getLastPluginEnterAction 方法不可用');
  }
});

// 暴露时间戳转换相关的 API 到渲染进程
window.timestampAPI = {
  // 获取当前时间戳（毫秒）
  getCurrentTimestamp: function() {
    return Date.now();
  },

  // 获取可用的时区列表
  getTimezones: function() {
    try {
      // 使用 Intl.supportedValuesOf() 获取所有支持的时区
      const allTimezones = Intl.supportedValuesOf('timeZone');
      
      // 常用时区列表（优先显示）
      const popularTimezones = [
        'UTC',
        'Asia/Shanghai',
        'America/New_York', 
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
        'America/Los_Angeles',
        'Europe/Paris',
        'Asia/Seoul',
        'Asia/Singapore',
        'America/Chicago',
        'Europe/Berlin',
        'Asia/Kolkata',
        'America/Sao_Paulo',
        'Africa/Cairo'
      ];

      // 获取当前时间用于计算偏移
      const now = new Date();
      
      // 生成时区选项
      const timezoneOptions = [];
      
      // 首先添加常用时区
      popularTimezones.forEach(tz => {
        if (allTimezones.includes(tz)) {
          const option = this._createTimezoneOption(tz, now);
          if (option) timezoneOptions.push(option);
        }
      });
      
      // 添加分隔符
      timezoneOptions.push({ 
        label: '─────── 其他时区 ───────', 
        value: '', 
        disabled: true 
      });
      
      // 添加其他时区（按字母顺序）
      const otherTimezones = allTimezones
        .filter(tz => !popularTimezones.includes(tz))
        .sort();
        
      otherTimezones.forEach(tz => {
        const option = this._createTimezoneOption(tz, now);
        if (option) timezoneOptions.push(option);
      });
      
      return timezoneOptions;
      
    } catch (error) {
      console.warn('无法获取时区列表，使用备用方案:', error);
      // 备用方案：返回硬编码的常用时区
      return this._getFallbackTimezones();
    }
  },

  // 创建时区选项
  _createTimezoneOption: function(timezone, referenceDate) {
    try {
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: timezone,
        timeZoneName: 'longOffset'
      });
      
      const parts = formatter.formatToParts(referenceDate);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');
      const offset = offsetPart ? offsetPart.value : '';
      
      // 获取时区的区域名称
      const regionName = timezone.split('/')[0];
      
      return {
        label: `${this._getTimezoneFriendlyName(timezone)} (${offset})`,
        value: timezone,
        group: regionName
      };
    } catch (error) {
      console.warn(`无法处理时区 ${timezone}:`, error);
      return null;
    }
  },

  // 获取时区友好名称
  _getTimezoneFriendlyName: function(timezone) {
    const friendlyNames = {
      'UTC': 'UTC 协调世界时',
      'Asia/Shanghai': '北京时间',
      'America/New_York': '纽约时间',
      'Europe/London': '伦敦时间',
      'Asia/Tokyo': '东京时间',
      'Australia/Sydney': '悉尼时间',
      'America/Los_Angeles': '洛杉矶时间',
      'Europe/Paris': '巴黎时间',
      'Asia/Seoul': '首尔时间',
      'Asia/Singapore': '新加坡时间',
      'America/Chicago': '芝加哥时间',
      'Europe/Berlin': '柏林时间',
      'Asia/Kolkata': '新德里时间',
      'America/Sao_Paulo': '圣保罗时间',
      'Africa/Cairo': '开罗时间'
    };
    
    return friendlyNames[timezone] || timezone.split('/').pop().replace(/_/g, ' ');
  },

  // 备用时区列表（当 Intl.supportedValuesOf 不可用时）
  _getFallbackTimezones: function() {
    return [
      { label: 'UTC 协调世界时', value: 'UTC' },
      { label: '北京时间 (UTC+8)', value: 'Asia/Shanghai' },
      { label: '纽约时间 (UTC-5/-4)', value: 'America/New_York' },
      { label: '伦敦时间 (UTC+0/+1)', value: 'Europe/London' },
      { label: '东京时间 (UTC+9)', value: 'Asia/Tokyo' },
      { label: '悉尼时间 (UTC+10/+11)', value: 'Australia/Sydney' },
      { label: '洛杉矶时间 (UTC-8/-7)', value: 'America/Los_Angeles' },
      { label: '巴黎时间 (UTC+1/+2)', value: 'Europe/Paris' },
      { label: '首尔时间 (UTC+9)', value: 'Asia/Seoul' },
      { label: '新加坡时间 (UTC+8)', value: 'Asia/Singapore' }
    ];
  },

  // 验证时间戳是否有效
  isValidTimestamp: function(timestamp, unit) {
    if (!timestamp || isNaN(timestamp)) return false;
    
    const num = parseInt(timestamp);
    const ms = unit === 's' ? num * 1000 : num;
    
    // 检查时间戳范围（1970-01-01 到 2100-01-01 之间）
    const minTime = 0;
    const maxTime = 4102444800000; // 2100-01-01
    
    return ms >= minTime && ms <= maxTime;
  },

  // 格式化时间戳为不同格式
  formatTimestamp: function(timestamp, unit, timezone) {
    const ms = unit === 's' ? timestamp * 1000 : timestamp;
    const date = new Date(ms);
    
    if (isNaN(date.getTime())) {
      throw new Error('无效的时间戳');
    }

    try {
      const options = { timeZone: timezone };
      
      // 获取时区偏移信息
      const offsetFormatter = new Intl.DateTimeFormat('zh-CN', {
        ...options,
        timeZoneName: 'longOffset'
      });
      const offsetParts = offsetFormatter.formatToParts(date);
      const offsetInfo = offsetParts.find(part => part.type === 'timeZoneName')?.value || '';
      
      // 获取时区缩写
      const shortFormatter = new Intl.DateTimeFormat('en-US', {
        ...options,
        timeZoneName: 'short'
      });
      const shortParts = shortFormatter.formatToParts(date);
      const shortName = shortParts.find(part => part.type === 'timeZoneName')?.value || '';
      
      return {
        standard: date.toLocaleString('zh-CN', {
          ...options,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        date: date.toLocaleDateString('zh-CN', {
          ...options,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }),
        time: date.toLocaleTimeString('zh-CN', {
          ...options,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        iso: date.toISOString(),
        weekday: date.toLocaleDateString('zh-CN', {
          ...options,
          weekday: 'long'
        }),
        // 新增字段
        timezone: timezone,
        timezoneOffset: offsetInfo,
        timezoneShort: shortName,
        unix: Math.floor(ms / 1000), // Unix 时间戳（秒）
        unixMs: ms, // Unix 时间戳（毫秒）
        // 相对时间
        relative: this._getRelativeTime(date)
      };
    } catch (error) {
      console.error('格式化时间戳失败:', error);
      throw new Error(`无法格式化时间戳到时区 ${timezone}: ${error.message}`);
    }
  },

  // 获取相对时间描述
  _getRelativeTime: function(date) {
    try {
      const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      
      const intervals = [
        { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
        { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
        { unit: 'day', ms: 24 * 60 * 60 * 1000 },
        { unit: 'hour', ms: 60 * 60 * 1000 },
        { unit: 'minute', ms: 60 * 1000 },
        { unit: 'second', ms: 1000 }
      ];
      
      for (const interval of intervals) {
        const count = Math.floor(Math.abs(diffMs) / interval.ms);
        if (count >= 1) {
          return rtf.format(diffMs > 0 ? count : -count, interval.unit);
        }
      }
      
      return '刚刚';
    } catch (error) {
      console.warn('获取相对时间失败:', error);
      return '';
    }
  },

  // 将日期时间转换为时间戳
  dateToTimestamp: function(dateTimeString) {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      throw new Error('无效的日期时间格式');
    }
    return date.getTime();
  },

  // 获取用户当前时区
  getUserTimezone: function() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('无法获取用户时区:', error);
      return 'UTC';
    }
  },

  // 检查浏览器是否支持时区功能
  checkTimezoneSupport: function() {
    return {
      supportedValuesOf: typeof Intl.supportedValuesOf === 'function',
      dateTimeFormat: typeof Intl.DateTimeFormat === 'function',
      relativeTimeFormat: typeof Intl.RelativeTimeFormat === 'function',
      timeZoneSupport: (() => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: 'UTC' });
          return true;
        } catch {
          return false;
        }
      })()
    };
  },

  // 批量转换时间戳到多个时区
  convertToMultipleTimezones: function(timestamp, unit, timezones) {
    const ms = unit === 's' ? timestamp * 1000 : timestamp;
    const results = {};
    
    timezones.forEach(tz => {
      try {
        results[tz] = this.formatTimestamp(ms, 'ms', tz);
      } catch (error) {
        console.warn(`转换到时区 ${tz} 失败:`, error);
        results[tz] = { error: error.message };
      }
    });
    
    return results;
  },

  // 获取插件信息
  getPluginInfo: function() {
    return {
      name: '时间戳转换器',
      version: '1.0.0',
      author: '帅之宇',
      description: '支持时间戳与日期时间的双向转换，支持多时区显示'
    };
  }
};

// 初始化消息
console.log('时间戳转换器插件预加载脚本已加载');
