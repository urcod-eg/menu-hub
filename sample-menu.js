/* بيانات تجريبية بنفس شكل مستند public/menu في Firestore.
   بتُستخدم لما useSample = true، وأداة tools/seed.html بترفعها كبداية لأي عميل جديد.
   تواريخ العروض نسبية للحظة الفتح عشان العدّادات تفضل شغالة في الديمو. */
(function () {
  const H = 36e5, at = h => new Date(Date.now() + h * H).toISOString();
  const t = (ar, en) => ({ ar, en });

  window.SAMPLE_META = {
    version: 1,
    updatedAt: new Date().toISOString(),
    license: { status: "active", plan: "annual", endsAt: null, menuOnExpiry: "show" }
  };

  window.SAMPLE_MENU = {
    schemaVersion: 1,
    brand: {
      name: t("اسم المطعم", "Restaurant Name"),
      tagline: t("عبارة تعريفية قصيرة", "Short tagline"),
      about: t("هنا بيكتب المطعم نبذة عنه: بدأ إمتى، بيقدّم إيه، وإيه اللي يميّزه. النص ده بيتعدّل من لوحة الإدارة.",
               "A short story about the restaurant goes here: when it started, what it serves and what makes it different. Edited from the admin panel."),
      initial: t("م", "R"),
      logoUrl: "",
      palette: "green"            /* green | navy | maroon | coffee | teal */
    },
    settings: {
      defaultLang: "ar",          /* ar | en */
      defaultTheme: "system",     /* system | light | dark */
      allowLang: true,
      allowTheme: true,
      currency: t("ج.م", "EGP"),
      showOffersTab: true,
      showNewTab: true
    },
    contact: {
      phone: "01000000000",
      whatsapp: "201000000000",
      address: t("عنوان الفرع الرئيسي، المدينة", "Main branch address, City"),
      mapsUrl: "https://maps.google.com",
      hours: [
        { day: 6, open: "10:00", close: "02:00" }, { day: 0, open: "10:00", close: "02:00" },
        { day: 1, open: "10:00", close: "02:00" }, { day: 2, open: "10:00", close: "02:00" },
        { day: 3, open: "10:00", close: "02:00" }, { day: 4, open: "12:00", close: "03:00" },
        { day: 5, open: "13:00", close: "03:00" }
      ],
      social: [
        { name: "Facebook", url: "https://facebook.com" },
        { name: "Instagram", url: "https://instagram.com" }
      ],
      orderEnabled: true,
      orderUrl: "https://example.com",
      orderLabel: t("اطلب أونلاين", "Order online")
    },
    /* parentId = null للقسم الرئيسي. available=false: يظهر باهت. hidden=true: مايظهرش خالص */
    categories: [
      { id: "hot",    parentId: null, name: t("مشروبات ساخنة", "Hot drinks"), icon: "coffee",  sort: 1, available: true,  hidden: false },
      { id: "burger", parentId: null, name: t("برجر", "Burgers"),             icon: "burger",  sort: 2, available: true,  hidden: false },
      { id: "pizza",  parentId: null, name: t("بيتزا", "Pizza"),              icon: "pizza",   sort: 3, available: true,  hidden: false },
      { id: "pz-cl",  parentId: "pizza", name: t("كلاسيك", "Classic"),        icon: "pizza",   sort: 1, available: true,  hidden: false },
      { id: "pz-sp",  parentId: "pizza", name: t("سبيشال", "Specials"),       icon: "pizza",   sort: 2, available: true,  hidden: false },
      { id: "sweet",  parentId: null, name: t("حلويات", "Desserts"),          icon: "dessert", sort: 4, available: false, hidden: false }
    ],
    /* priceType: single → price | variants → variants[]
       service: both | delivery_only | pickup_only
       offer.type: percent(value) | amount(value) | price(price أو prices{variantId}) | free_delivery | custom(text) */
    products: [
      { id: "h1", categoryId: "hot", name: t("قهوة تركي", "Turkish coffee"),
        desc: t("بن محوّج طازة بيتحمص كل أسبوع، بتتعمل على الرمل ببطء عشان يطلع الوش تقيل والطعم ناعم. بتتقدم مع كوباية مية.",
                "Freshly roasted spiced grind, brewed slowly on hot sand for a thick foam and smooth taste. Served with water."),
        priceType: "variants", variants: [{ id: "S", price: 30 }, { id: "M", price: 40 }, { id: "L", price: 50 }],
        image: "", available: true, service: "both", sort: 1, featured: false, isNew: false },
      { id: "h2", categoryId: "hot", name: t("لاتيه بندق", "Hazelnut latte"),
        desc: t("إسبريسو دبل مع لبن مبخّر وصوص بندق بيتعمل في المطعم. ينفع يتعمل بلبن لوز.",
                "Double espresso, steamed milk and house-made hazelnut sauce. Available with almond milk."),
        priceType: "variants", variants: [{ id: "S", price: 55 }, { id: "M", price: 65 }, { id: "L", price: 75 }],
        image: "", available: true, service: "both", sort: 2, isNew: true,
        offer: { enabled: true, type: "percent", value: 20, startAt: null, endAt: at(53) } },
      { id: "h3", categoryId: "hot", name: t("سحلب بالمكسرات", "Sahlab with nuts"),
        desc: t("سحلب كريمي سخن عليه جوز هند وفستق وزبيب.", "Hot creamy sahlab topped with coconut, pistachio and raisins."),
        priceType: "single", price: 45, image: "", available: false, service: "pickup_only", sort: 3 },
      { id: "h4", categoryId: "hot", name: t("شاي بالنعناع", "Mint tea"),
        desc: t("شاي فتلة مع نعناع أخضر طازة.", "Loose-leaf tea with fresh mint."),
        priceType: "single", price: 20, image: "", available: true, service: "both", sort: 4,
        offer: { enabled: true, type: "percent", value: 10, startAt: null, endAt: at(-20) } },
      { id: "b1", categoryId: "burger", name: t("برجر كلاسيك", "Classic burger"),
        desc: t("قطعة لحمة بلدي ١٥٠ جم مشوية على الفحم، جبنة شيدر، خس وطماطم وبصل، في عيش بريوش. معاه بطاطس.",
                "150 g local beef grilled over charcoal, cheddar, lettuce, tomato and onion in a brioche bun. Comes with fries."),
        priceType: "single", price: 120, image: "", available: true, service: "both", sort: 1,
        offer: { enabled: true, type: "custom", text: t("اشتري ٢ والتالت هدية", "Buy 2, get the 3rd free"), endAt: at(26) } },
      { id: "b2", categoryId: "burger", name: t("برجر دبل", "Double burger"),
        desc: t("قطعتين لحمة ١٥٠ جم، دبل شيدر، بصل مكرمل وصوص البيت.", "Two 150 g patties, double cheddar, caramelised onion and house sauce."),
        priceType: "single", price: 185, image: "", available: true, service: "delivery_only", sort: 2, isNew: true,
        offer: { enabled: true, type: "price", price: 150, endAt: at(9.5) } },
      { id: "b3", categoryId: "burger", name: t("تشيكن كرسبي", "Crispy chicken"),
        desc: t("صدور فراخ متتبلة ومقرمشة مع كول سلو وصوص رانش.", "Marinated crispy chicken breast with coleslaw and ranch."),
        priceType: "single", price: 110, image: "", available: true, service: "both", sort: 3 },
      { id: "b4", categoryId: "burger", name: t("برجر مشروم", "Mushroom burger"),
        desc: t("لحمة بلدي مع مشروم سوتيه وجبنة سويسري.", "Local beef with sautéed mushrooms and Swiss cheese."),
        priceType: "single", price: 140, image: "", available: true, service: "both", sort: 4, isNew: true },
      { id: "p1", categoryId: "pz-cl", name: t("مارجريتا", "Margherita"),
        desc: t("عجينة بتختمر ٢٤ ساعة، صلصة طماطم البيت وموتزاريلا وريحان.", "24-hour dough, house tomato sauce, mozzarella and basil."),
        priceType: "variants", variants: [{ id: "S", price: 90 }, { id: "M", price: 130 }, { id: "L", price: 170 }],
        image: "", available: true, service: "both", sort: 1,
        offer: { enabled: true, type: "amount", value: 25, endAt: at(146) } },
      { id: "p3", categoryId: "pz-cl", name: t("خضار مشكل", "Garden veggie"),
        desc: t("فلفل ومشروم وزيتون وطماطم وبصل.", "Peppers, mushrooms, olives, tomato and onion."),
        priceType: "variants", variants: [{ id: "M", price: 120 }, { id: "L", price: 160 }],
        image: "", available: true, service: "both", sort: 2,
        offer: { enabled: true, type: "price", prices: { M: 99, L: 135 }, endAt: at(31) } },
      { id: "p2", categoryId: "pz-sp", name: t("سوبر سوبريم", "Super supreme"),
        desc: t("سجق وبسطرمة وفلفل ألوان وزيتون ومشروم.", "Sausage, pastrami, peppers, olives and mushrooms."),
        priceType: "variants", variants: [{ id: "S", price: 120 }, { id: "M", price: 165 }, { id: "L", price: 210 }],
        image: "", available: true, service: "delivery_only", sort: 1, isNew: true,
        offer: { enabled: true, type: "free_delivery", endAt: at(75) } },
      { id: "s1", categoryId: "sweet", name: t("أم علي", "Om Ali"),
        desc: t("رقائق مخبوزة باللبن والقشطة والمكسرات، بتتقدم سخنة.", "Baked pastry with milk, cream and nuts, served hot."),
        priceType: "single", price: 70, image: "", available: true, service: "both", sort: 1 },
      { id: "s2", categoryId: "sweet", name: t("كنافة نابلسية", "Nabulsi kunafa"),
        desc: t("كنافة ناعمة بجبنة عكاوي وقطر خفيف.", "Fine kunafa with Akkawi cheese and light syrup."),
        priceType: "single", price: 85, image: "", available: true, service: "both", sort: 2 }
    ],
    /* theme: green | amber | rose | blue | dark. image اختياري (رابط) بدل الأيقونة */
    ads: [
      { id: "ad1", enabled: true, sort: 1, theme: "green", icon: "pizza", image: "",
        kicker: t("خصم ٢٥ ج.م", "EGP 25 off"), title: t("على كل أحجام المارجريتا", "Every Margherita size"), body: t("العرض شغال الأسبوع ده", "Running all week") },
      { id: "ad2", enabled: true, sort: 2, theme: "amber", icon: "coffee", image: "",
        kicker: t("خصم ٢٠٪", "20% off"), title: t("لاتيه بندق", "Hazelnut latte"), body: t("لفترة محدودة", "Limited time") },
      { id: "ad3", enabled: true, sort: 3, theme: "rose", icon: "burger", image: "",
        kicker: t("عرض النهارده", "Today only"), title: t("برجر دبل بـ ١٥٠ ج.م", "Double burger EGP 150"), body: t("لحد ١٢ بالليل", "Until midnight") }
    ]
  };
})();
