var GameMode = cc.Enum({
    Building: 0,
    Rushing: 1,
})

var GameManager = cc.Class({
    extends: cc.Component,
    // editor:{
    //     executeInEditMode:true
    // },
    properties: {
        score: {
            visible: false,
            get: function() {
                if (!this.uiMng) return 0;
                return this.uiMng.score.value;
            },
            set: function(value) {
                this.uiMng.setScore(value);
            }
        },
        settingsJson: {
            default: null,
            type: cc.JsonAsset,
        },
        mode: {
            type: GameMode,
            default: GameMode.Building,
        },
        // 解耦管理器
        metro: {
            default: null,
            type: cc.Node,
        },
        canvas: {
            default: null,
            type: cc.Node,
        }

    },
    statics: {
        InputType: {
            TOUTCHMOV: "touch_move",
        }
    },
    onLoad() {
        this._loadSettins(this.settingsJson.json) // 游戏设置全局可读取
    },
    start() {
        // .getExtension("EXT_frag_depth")
        // let gl = cc.renderer.device._gl
        // var available_extensions = gl.getSupportedExtensions()
        // gl.getExtension("GL_EXT_frag_depth")
        // console.log(available_extensions);

        //cc.JsonAsset

        // 注意必须 是 canvas才行


        this.playerMng = this.initMng("PlayerManager", this);
        this.playerMng.initManager(this)


        this.startGame()



    },
    initMng(name, obj) { //obj 为 manager 挂载的位置
        var mng = obj.getComponent(name);
        if (mng != null) return mng;
        var mng = obj.addComponent(name);
        return mng;
    },
    //游戏状态相关
    startGame() {
        console.log(this);
        switch (this.mode) {
            case GameMode.Rushing:
                this.inputMng = this.initMng("InputManager", this.metro)
                this.inputMng.initManager(this);
                this.dataMng = this.initMng("DataManager", this);
                this.dataMng.initManager(this)
                this.animMng = this.initMng("AnimationManager", this.node);
                this.animMng.initManager(this);
                this.uiMng = this.initMng("UIManager", this.canvas);
                this.uiMng.initManager(this);
                // this.score = 0;
                this.dataMng.onGameStart((err) => {
                    if (err == null) { // 加载成功
                        this.metroMng = this.initMng("MetroManager", this.metro);
                        this.metroMng.initManager(this);
                        this.metroMng.station_datas = this.dataMng.station_datas
                        this.metroMng.onGameStart()
                    } else {
                        throw "站点数据加载失败"
                    }
                })
                break;
            case GameMode.Building:
                this.inputMng = this.initMng("InputManager", this.canvas)
                this.inputMng.initManager(this);
                this.metroBuilderMng = this.initMng("MetroBuilderManager", this.metro)
                this.metroBuilderMng.initManager(this)
                this.uiMng = this.initMng("BuilderUIManager", this.canvas)
                this.uiMng.initManager(this)
                this.dataMng = this.initMng("BuilderDataManager", this)
                this.dataMng.initManager(this)
                break;
            default:
                break;
        }
    },
    exitGame() {
        if (this.animMng)
            this.animMng.destroy();
        //this.compoMng.destroy();
        this.node.targetOff(this.node);
    },
    pauseGame() {
        this.checkerMng.checkers.forEach(cks => {
            cks.forEach(ck => {
                ck.node.pauseAllActions();
            });
        });
        this.inputMng.inputable = false;
    },
    continueGame() {
        this.checkerMng.checkers.forEach(cks => {
            cks.forEach(ck => {
                ck.node.resumeAllActions();
            });
        });
        this.inputMng.inputable = true;
    },
    listenToInput(type, callback, target) { //监听 输入事件
        console.log(target);

        this.inputMng.node.on(type, callback, target);
    },
    _loadSettins(settings) {
        window.game_settings = settings; // 游戏设置全局可读取     
        var copyAttr = function(a, b) { // 将 b 的属性 都拷贝给 a
                for (let key in b) {
                    a[key] = b[key]
                }
            }
            // 将配置写入到 各个 类中 作为静态字段
        copyAttr(require("MetroStation"), settings.stations)
        copyAttr(require("MetroManager"), settings.metro)
        copyAttr(require("MetroLine"), settings.line)
        copyAttr(require("MetroCar"), settings.car)
    },
    loadData(type, param) { // TODO 任何数据的获取 都需要加载完毕后才继续
        return this.dataMng.loadData(type, param)
    },
    getPrefab(type, name) {
        return this.dataMng.getPrefab(type, name)
    },
    getRandomPrefab(type) {
        return this.dataMng.getRandomPrefab(type)
    },
    getMaterial(name) { //获取指定的 材质的新实例
        return this.dataMng.getMaterial(name)
    },
    setSelectFocus(elem) {
        this.uiMng.setFocus(elem)
    },
    addCoin(n) {
        this.playerMng.addCoin(n)
    },
    spendCoin(n) {
        this.playerMng.spendCoin(n)
    },
    exit(){
        this.metroMng.exit()
    }




});