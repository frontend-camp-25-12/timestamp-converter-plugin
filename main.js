/**
 * 时间戳转换器主逻辑
 * 符合 CommonJS 模块规范和项目约定
 */

class TimestampConverter {
    constructor() {
        this.elements = {};
        this.initElements();
        this.initTimezones();
        this.bindEvents();
        this.showWelcomeToast();
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        const elementIds = [
            'timestampInput', 'timestampUnit', 'convertBtn', 'currentTimeBtn', 
            'clearBtn', 'timezoneSelect', 'standardFormat', 'dateFormat', 
            'timeFormat', 'weekdayFormat', 'isoFormat', 'datetimeInput', 
            'reverseConvertBtn', 'reverseResult', 'msTimestamp', 'sTimestamp',
            'toast', 'toastMessage', 'hotkeySettingsBtn'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    /**
     * 初始化时区选择器
     */
    initTimezones() {
        if (!window.timestampAPI) {
            this.showToast('插件API未加载完成', 'error');
            return;
        }

        // 检查时区支持情况
        const support = window.timestampAPI.checkTimezoneSupport();
        if (!support.timeZoneSupport) {
            this.showToast('当前浏览器不完全支持时区功能', 'warning');
        }

        try {
            const timezones = window.timestampAPI.getTimezones();
            let currentGroup = '';
            
            timezones.forEach(tz => {
                // 如果是分组标题（disabled 选项）
                if (tz.disabled) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = tz.label;
                    this.elements.timezoneSelect.appendChild(optgroup);
                    return;
                }
                
                const option = document.createElement('option');
                option.value = tz.value;
                option.textContent = tz.label;
                
                // 如果有分组信息，添加到对应的 optgroup
                if (tz.group && tz.group !== currentGroup) {
                    currentGroup = tz.group;
                    let optgroup = this.elements.timezoneSelect.querySelector(`optgroup[label="${currentGroup}"]`);
                    if (!optgroup) {
                        optgroup = document.createElement('optgroup');
                        optgroup.label = currentGroup;
                        this.elements.timezoneSelect.appendChild(optgroup);
                    }
                    optgroup.appendChild(option);
                } else {
                    this.elements.timezoneSelect.appendChild(option);
                }
            });

            // 默认选择用户当前时区，如果失败则选择北京时间
            const userTimezone = window.timestampAPI.getUserTimezone();
            this.elements.timezoneSelect.value = userTimezone || 'Asia/Shanghai';
            
            console.log('时区初始化完成，当前时区:', this.elements.timezoneSelect.value);
            
        } catch (error) {
            console.error('初始化时区失败:', error);
            this.showToast('时区初始化失败，请刷新重试', 'error');
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 主要转换按钮
        this.elements.convertBtn.addEventListener('click', () => this.convertTimestamp());
        
        // 获取当前时间戳
        this.elements.currentTimeBtn.addEventListener('click', () => this.getCurrentTimestamp());
        
        // 清空按钮
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        
        // 反向转换
        this.elements.reverseConvertBtn.addEventListener('click', () => this.reverseConvert());
        
        // 键盘事件
        this.elements.timestampInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.convertTimestamp();
        });

        this.elements.datetimeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.reverseConvert();
        });

        // 时区变化时自动重新转换
        this.elements.timezoneSelect.addEventListener('change', () => {
            if (this.elements.timestampInput.value.trim()) {
                this.convertTimestamp();
            }
        });

        // 单位变化时自动重新转换
        this.elements.timestampUnit.addEventListener('change', () => {
            if (this.elements.timestampInput.value.trim()) {
                this.convertTimestamp();
            }
        });

        // 输入框实时验证
        this.elements.timestampInput.addEventListener('input', (e) => {
            this.validateTimestampInput(e.target);
        });

        // 快捷键设置按钮
        this.elements.hotkeySettingsBtn.addEventListener('click', () => this.openHotkeySettings());
    }

    /**
     * 验证时间戳输入
     */
    validateTimestampInput(input) {
        const value = input.value.trim();
        if (!value) {
            input.style.borderColor = '#e0e6ed';
            return;
        }

        const isValid = window.timestampAPI.isValidTimestamp(
            parseInt(value), 
            this.elements.timestampUnit.value
        );

        input.style.borderColor = isValid ? '#27ae60' : '#e74c3c';
    }

    /**
     * 获取当前时间戳
     */
    getCurrentTimestamp() {
        try {
            const now = window.timestampAPI.getCurrentTimestamp();
            this.elements.timestampInput.value = now;
            this.validateTimestampInput(this.elements.timestampInput);
            this.convertTimestamp();
            this.showToast('已获取当前时间戳', 'success');
        } catch (error) {
            this.showToast('获取当前时间戳失败: ' + error.message, 'error');
        }
    }

    /**
     * 转换时间戳为日期时间
     */
    convertTimestamp() {
        const input = this.elements.timestampInput.value.trim();
        if (!input) {
            this.showToast('请输入时间戳', 'error');
            return;
        }

        const timestamp = parseInt(input);
        if (isNaN(timestamp)) {
            this.showToast('请输入有效的数字', 'error');
            return;
        }

        try {
            const unit = this.elements.timestampUnit.value;
            const timezone = this.elements.timezoneSelect.value;
            
            // 使用 preload.js 中的 API 进行转换
            const formatted = window.timestampAPI.formatTimestamp(timestamp, unit, timezone);
            
            this.displayResult(formatted);
            this.showToast('转换成功！', 'success');
        } catch (error) {
            this.showToast('转换失败: ' + error.message, 'error');
            this.clearResult();
        }
    }

    /**
     * 显示转换结果
     */
    displayResult(formatted) {
        this.elements.standardFormat.textContent = formatted.standard;
        this.elements.dateFormat.textContent = formatted.date;
        this.elements.timeFormat.textContent = formatted.time;
        this.elements.weekdayFormat.textContent = formatted.weekday;
        this.elements.isoFormat.textContent = formatted.iso;
        
        // 如果有新的字段，也一并显示
        if (formatted.relative) {
            // 尝试找到相对时间元素，如果没有就创建
            let relativeElement = document.getElementById('relativeFormat');
            if (!relativeElement) {
                // 在结果区域添加相对时间显示
                const resultGrid = document.querySelector('.result-grid');
                if (resultGrid) {
                    const relativeItem = document.createElement('div');
                    relativeItem.className = 'result-item';
                    relativeItem.innerHTML = `
                        <span class="result-label">相对时间:</span>
                        <span id="relativeFormat" class="result-value">${formatted.relative}</span>
                    `;
                    resultGrid.appendChild(relativeItem);
                }
            } else {
                relativeElement.textContent = formatted.relative;
            }
        }
        
        // 更新时区信息显示
        if (formatted.timezoneOffset) {
            let tzElement = document.getElementById('timezoneInfo');
            if (!tzElement) {
                const resultGrid = document.querySelector('.result-grid');
                if (resultGrid) {
                    const tzItem = document.createElement('div');
                    tzItem.className = 'result-item';
                    tzItem.innerHTML = `
                        <span class="result-label">时区信息:</span>
                        <span id="timezoneInfo" class="result-value">${formatted.timezoneOffset}</span>
                    `;
                    resultGrid.appendChild(tzItem);
                }
            } else {
                tzElement.textContent = formatted.timezoneOffset;
            }
        }
    }

    /**
     * 清空结果显示
     */
    clearResult() {
        const resultElements = [
            'standardFormat', 'dateFormat', 'timeFormat', 'weekdayFormat', 'isoFormat',
            'relativeFormat', 'timezoneInfo'
        ];
        
        resultElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '-';
            }
        });
    }

    /**
     * 反向转换：日期时间转时间戳
     */
    reverseConvert() {
        const datetime = this.elements.datetimeInput.value;
        if (!datetime) {
            this.showToast('请选择日期时间', 'error');
            return;
        }

        try {
            const timestamp = window.timestampAPI.dateToTimestamp(datetime);
            
            this.elements.msTimestamp.textContent = timestamp.toString();
            this.elements.sTimestamp.textContent = Math.floor(timestamp / 1000).toString();
            
            this.elements.reverseResult.classList.remove('hidden');
            this.showToast('反向转换成功！', 'success');
        } catch (error) {
            this.showToast('转换失败: ' + error.message, 'error');
            this.elements.reverseResult.classList.add('hidden');
        }
    }

    /**
     * 清空所有输入和结果
     */
    clearAll() {
        this.elements.timestampInput.value = '';
        this.elements.datetimeInput.value = '';
        this.elements.timestampInput.style.borderColor = '#e0e6ed';
        this.clearResult();
        this.elements.reverseResult.classList.add('hidden');
        this.showToast('已清空所有内容', 'success');
    }

    /**
     * 显示消息提示
     */
    showToast(message, type = 'info') {
        if (!this.elements.toast || !this.elements.toastMessage) return;

        this.elements.toastMessage.textContent = message;
        this.elements.toast.className = `toast ${type}`;
        this.elements.toast.classList.remove('hidden');

        // 3秒后自动隐藏
        setTimeout(() => {
            this.elements.toast.classList.add('hidden');
        }, 3000);
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeToast() {
        // 检查时区支持
        const support = window.timestampAPI.checkTimezoneSupport();
        if (support.supportedValuesOf) {
            this.showToast('时区功能已启用，支持全球时区转换', 'success');
        } else {
            this.showToast('使用基础时区功能', 'info');
        }
    }

    /**
     * 打开快捷键设置
     */
    openHotkeySettings() {
        try {
            // 检查平台API是否可用
            if (!window.platform) {
                this.showToast('平台API未加载，请检查预加载脚本', 'error');
                return;
            }
            
            // 检查方法是否存在
            if (typeof window.platform.openHotkeySettings !== 'function') {
                this.showToast('快捷键设置功能暂未实现', 'warning');
                console.log('可用的平台API方法:', Object.keys(window.platform));
                return;
            }
            
            // 使用平台API打开快捷键设置，并高亮显示时间戳转换的快捷键设置
            window.platform.openHotkeySettings('convert');
            this.showToast('已打开快捷键设置页面', 'success');
        } catch (error) {
            console.error('打开快捷键设置失败:', error);
            this.showToast('打开快捷键设置失败: ' + error.message, 'error');
            
            // 显示可用的API方法供调试
            if (window.platform) {
                console.log('可用的平台API方法:', Object.keys(window.platform));
            }
        }
    }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    try {
        new TimestampConverter();
        console.log('时间戳转换器初始化成功');
    } catch (error) {
        console.error('时间戳转换器初始化失败:', error);
        alert('插件初始化失败，请刷新重试');
    }
});

// 导出供测试使用（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimestampConverter;
}
