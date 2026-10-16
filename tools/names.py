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
