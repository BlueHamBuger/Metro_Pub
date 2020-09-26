// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html


// deprecated for 2d
cc.Class({
    extends: cc.Component,
    editor: {
        executeInEditMode: true,
        playOnFocus: true,
    },
    properties: {},


    start() {
        var skin = this.node.children[0]
        skin.setAnchorPoint(cc.Vec2.ZERO)
        this.node.setAnchorPoint(cc.Vec2.ZERO)
        var spriteFrame = skin.getComponent(cc.Sprite).spriteFrame
        this.texture = spriteFrame.getTexture()
        var spriteRect = spriteFrame.getRect()
        this.canvas = document.createElement("canvas")
        this.canvas.width = this.texture.width
        this.canvas.height = this.texture.height
        this.context = this.canvas.getContext("2d")
            //var pixel_amount = spriteRect.width * spriteRect.height
        var lastRowIdx = spriteRect.width * (spriteRect.height - 1) * 4 - 1
        this.context.drawImage(this.texture.getHtmlElementObj(), spriteRect.x, spriteRect.y, spriteRect.width, spriteRect.height, 0, 0, spriteRect.width, spriteRect.height)
        var imageData = this.context.getImageData(0, 0, spriteRect.width, spriteRect.height).data
        for (let i = lastRowIdx; i < imageData.length; i += 4) {
            if (imageData[i] != 0) { // 找到 左下角第一个不为 透明的 像素低点
                // 将其作为 该 实体的 原点
                let pixel_no = ((i + 1) / 4)
                let height = Math.floor(pixel_no / spriteRect.width)
                let width = pixel_no - height * spriteRect.width
                let app_pos = skin.convertToWorldSpaceAR(cc.Vec2.ZERO)
                let local_pos = this.node.parent.convertToNodeSpaceAR(app_pos)
                skin.setParent(this.node.parent)
                skin.setPosition(local_pos)
                    //之所以是 0  是因为 spriteFrame 的texture是经过裁剪的 高度0 即代表的是 最下方了
                this.node.setPosition(this.node.parent.convertToNodeSpaceAR(skin.convertToWorldSpaceAR(cc.v2(width, 0))))
                local_pos = this.node.convertToNodeSpaceAR(app_pos)
                skin.setParent(this.node)
                skin.setPosition(local_pos)
                break;
            }
        }
        let infras = this.node.addComponent("Infrastructure")
            // infras.
        this.node.setPosition(0, 0)
        skin.name = "skin"
        this.node.removeComponent(this)
            //this._initViewData(imageData,Math.round(-skin.position.x),)
    },
    // _initViewData(img_data, pixel_origin, infras, spriteFrame) {
    //     this._initViewDepthData(img_data, pixel_origin, infras, spriteFrame)
    // },
    // _initViewDepthData(img_data, pixel_origin, infras, spriteFrame) { // 初始化 深度信息
    //     let data = img_data.data // rgba 图片的数据
    //     let data_idx = (pixel_origin.y * img_data.width + pixel_origin.x) * 4 // 起始点在图片数据中的位置
    //     let MetroMng = Infrastructure.MetroMng
    //     Infrastructure.MetroMng.idx2pos()
    //     let size = infras.size
    //     let grid_idx = infras.idx // 
    //     let spriteRect = spriteFrame._rect
    //         // 深度数据 大小等同于 count
    //     let count = spriteRect.width * spriteRect.height
    //     let depth_data = new Uint8Array(count)
    //     for (let i = 0; i < spriteRect.width; i++) {
    //         for (let j = 0; j < spriteRect.height; j++) {
    //             let cur_idx = Infrastructure.MetroMng.pos2idx(cc.v2(i, j))
    //             if (cur_idx < len(depth_data)) {}
    //         }
    //     }
    //     new ActiveXObject("")
    // }

    // update (dt) {},
});