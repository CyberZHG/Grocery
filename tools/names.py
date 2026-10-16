import random

ZH_SURNAMES = list('王李张刘陈杨赵黄周吴徐孙马朱胡郭何林高罗牛熊钱金宋田')
ZH_JOKE = {
    'm': ['铁柱', '狗蛋', '大壮', '二狗', '栓柱', '石头', '富贵', '来福', '铁蛋', '二牛', '大锤', '小强', '宝根', '有才',
          '大力', '二柱', '三炮', '旺财', '黑蛋', '满仓', '金宝', '二愣', '大毛', '钢蛋'],
    'f': ['翠花', '秀兰', '春花', '二丫', '小芳', '桂芬', '凤霞', '美丽', '丫蛋', '胖妞', '大花', '菊香', '金凤', '彩霞',
          '腊梅', '小翠', '喜妹', '桃花', '二妞', '红霞', '玉兰', '秋菊', '水仙', '杏儿'],
}
ZH_NORMAL = {'m': ['家豪', '志明', '俊杰', '浩然', '子轩', '明哲', '宇轩', '嘉乐'], 'f': ['雅琪', '思颖', '嘉欣', '婉婷', '静怡', '诗涵', '若兰', '雨桐']}
ZH_KID = ['豆豆', '毛毛', '球球', '皮皮', '胖虎', '跳跳', '乐乐', '嘟嘟', '糖糖', '果果', '蛋蛋', '妞妞', '饼饼', '壮壮']
ZH_ELDER = {'m': ['大爷', '老伯', '老爷子', '大叔'], 'f': ['奶奶', '大妈', '婆婆', '阿姨']}

EN_JOKE_FIRST = {
    'm': ['Bubba', 'Skeeter', 'Dusty', 'Tater', 'Moose', 'Tiny', 'Buck', 'Cletus', 'Biff', 'Chip', 'Duke', 'Buster',
          'Gus', 'Hank', 'Spud', 'Bo', 'Rusty', 'Earl', 'Sonny', 'Butch', 'Ziggy', 'Bronco', 'Rocco', 'Dewey'],
    'f': ['Peaches', 'Dottie', 'Bunny', 'Trixie', 'Lulu', 'Birdie', 'Pebbles', 'Muffin', 'Cookie', 'Taffy', 'Ginger',
          'Bubbles', 'Sunny', 'Twinkle', 'Honey', 'Daisy Mae', 'Babs', 'Fifi', 'Jolene', 'Goldie', 'Dixie', 'Pippa'],
}
EN_JOKE_LAST = ['Snodgrass', 'Wigglesby', 'McNugget', 'Picklebottom', 'Buttersworth', 'Noodleman', 'Puddlefoot',
                'Crumpet', 'Biscuitson', 'Goosey', 'Fizzwater', 'Bumbleton', 'Pumpernickel', 'Tatersby', 'Doodlebug',
                'Wafflestein', 'Sprinkles', 'Higginbottom', 'Jellyfield', 'Puddingham', 'Sizzleworth', 'Gravy',
                'Macaroni', 'Bonkers', 'Hornswoggle', 'Fudge']
EN_NORMAL_FIRST = {'m': ['Kevin', 'Daniel', 'Jason', 'Eric', 'Henry', 'Ryan', 'Leo', 'Ethan'],
                   'f': ['Grace', 'Emily', 'Michelle', 'Amy', 'Vivian', 'Iris', 'Chloe', 'Hannah']}
EN_NORMAL_LAST = ['Lin', 'Chen', 'Wang', 'Kim', 'Park', 'Tanaka', 'Wong', 'Lee', 'Sato', 'Huang']
EN_KID = {'m': ['Timmy', 'Bobby', 'Jimmy', 'Billy', 'Tommy', 'Joey', 'Petey'], 'f': ['Suzie', 'Sally', 'Penny', 'Molly', 'Lizzie', 'Tilly', 'Mimi']}
EN_ELDER = {'m': ['Grandpa', 'Old Man', 'Uncle'], 'f': ['Granny', 'Grandma', 'Auntie']}


def make_name(rnd: random.Random, sex: str, kind: str, used_en: set, used_zh: set, joke_ratio=0.75):
    """Mostly playful names, about a quarter ordinary. Each locale has its own name."""
    for _ in range(200):
        joke = rnd.random() < joke_ratio
        if kind == 'kid':
            en = f"{rnd.choice(EN_KID[sex])} {rnd.choice(EN_JOKE_LAST)}"
            zh = rnd.choice(ZH_SURNAMES) + rnd.choice(ZH_KID)
        elif kind == 'elder' and rnd.random() < 0.7:
            en = f"{rnd.choice(EN_ELDER[sex])} {rnd.choice(EN_JOKE_LAST if joke else EN_NORMAL_LAST)}"
            zh = rnd.choice(ZH_SURNAMES) + rnd.choice(ZH_ELDER[sex])
        elif joke:
            en = f"{rnd.choice(EN_JOKE_FIRST[sex])} {rnd.choice(EN_JOKE_LAST)}"
            zh = rnd.choice(ZH_SURNAMES) + rnd.choice(ZH_JOKE[sex])
        else:
            en = f"{rnd.choice(EN_NORMAL_FIRST[sex])} {rnd.choice(EN_NORMAL_LAST)}"
            zh = rnd.choice(ZH_SURNAMES) + rnd.choice(ZH_NORMAL[sex])
        if en not in used_en and zh not in used_zh:
            used_en.add(en)
            used_zh.add(zh)
            return en, zh
    raise RuntimeError('name pool exhausted')


JA_SURNAMES = ['山田', '田中', '鈴木', '佐藤', '高橋', '伊藤', '渡辺', '中村', '小林', '加藤', '吉田', '松本', '井上', '木村', '林', '斎藤']
JA_JOKE = {
    'm': ['権兵衛', '熊五郎', '八兵衛', 'ゴン太', 'ポン吉', '鉄平', '大五郎', '与作', '留吉', '茂作', '寅次郎', '金太', 'カン太', '太助'],
    'f': ['おハナ', 'タマ子', 'お松', '梅子', 'トメ', 'おツル', '花子', '菊乃', 'よね', 'ちよ', 'ポン子', 'お福', 'マメ子', 'カメ子'],
}
JA_NORMAL = {'m': ['翔太', '健太', '拓海', '大輝', '蓮', '悠真'], 'f': ['美咲', '結衣', '葵', '陽菜', '凛', '紗希']}
JA_KID = ['けんちゃん', 'ゆうくん', 'はなちゃん', 'みいちゃん', 'こうちゃん', 'ぽんちゃん', 'まめちゃん', 'たっくん']
JA_ELDER = {'m': ['じいちゃん', 'のおじさん'], 'f': ['ばあちゃん', 'のおばさん']}

KO_SURNAMES = list('김이박최정강조윤장임한오서신권황')
KO_JOKE = {
    'm': ['똘이', '삼식이', '개똥이', '덕배', '영구', '맹구', '복동이', '칠복이', '순돌이', '만수', '갑돌이', '돌쇠', '봉팔이', '춘삼이'],
    'f': ['막순이', '말순이', '끝순이', '꽃분이', '점순이', '옥분이', '복순이', '순자', '갑순이', '삼순이', '말자', '달래'],
}
KO_NORMAL = {'m': ['민준', '서준', '지호', '도윤', '하준', '시우'], 'f': ['서연', '지우', '하은', '수아', '지민', '예린']}
KO_KID = ['콩이', '별이', '봄이', '두부', '찐빵', '꼬맹이', '방울이', '토리']
KO_ELDER = {'m': [' 할아버지', ' 아저씨'], 'f': [' 할머니', ' 아줌마']}


def make_name_jk(rnd: random.Random, sex: str, kind: str, used: set, joke_ratio=0.75):
    """Japanese and Korean names, drawn independently so en/zh names stay stable."""
    for _ in range(300):
        joke = rnd.random() < joke_ratio
        sj, sk = rnd.choice(JA_SURNAMES), rnd.choice(KO_SURNAMES)
        if kind == 'kid':
            ja, ko = sj + rnd.choice(JA_KID), sk + rnd.choice(KO_KID)
        elif kind == 'elder' and rnd.random() < 0.7:
            je = rnd.choice(JA_ELDER[sex])
            ja = sj + ('の' + je if not je.startswith('の') else je)
            ko = sk + rnd.choice(KO_ELDER[sex])
        elif joke:
            ja, ko = sj + rnd.choice(JA_JOKE[sex]), sk + rnd.choice(KO_JOKE[sex])
        else:
            ja, ko = sj + rnd.choice(JA_NORMAL[sex]), sk + rnd.choice(KO_NORMAL[sex])
        if ja not in used and ko not in used:
            used.add(ja)
            used.add(ko)
            return ja, ko
    raise RuntimeError('name pool exhausted')
