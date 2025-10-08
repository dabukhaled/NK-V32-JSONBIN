// متغير عام لحفظ النص المظلل من المواقع
window.selectedTextFromSite = '';

// وظائف النسخ واللصق
function initializeClipboardFunctions() {
    // نسخ النص المحدد من بطاقات الأفلام
    document.addEventListener('mouseup', function() {
        let selectedText = window.getSelection().toString().trim();
        if (selectedText && selectedText.length > 0) {
            let selection = window.getSelection();
            let parent = selection.anchorNode.parentElement;

            // التحقق من وجود iframe (موقع مفتوح داخلياً)
            const iframe = document.getElementById('movie-player');
            if (iframe && iframe.style.display !== 'none') {
                // حفظ النص المظلل في المتغير العام
                window.selectedTextFromSite = selectedText;
                // نسخ النص للحافظة أيضاً
                navigator.clipboard.writeText(selectedText).then(() => {
                    showNotification('تم نسخ النص من الموقع وحفظه للاستخدام');
                }).catch(err => {
                    console.error('فشل نسخ النص: ', err);
                });
                return;
            }

            // الوظيفة الأصلية لبطاقات الأفلام
            if (parent.closest('.movie-card')) {
                navigator.clipboard.writeText(selectedText).then(() => {
                    showNotification('تم نسخ النص بنجاح');
                }).catch(err => {
                    console.error('فشل نسخ النص: ', err);
                });
            }
        }
    });

    // لصق النص في حقل البحث
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('click', function() {
        navigator.clipboard.readText().then(text => {
            if (text) {
                this.value = text;
                const searchEvent = new Event('input');
                this.dispatchEvent(searchEvent);
            }
        }).catch(err => {
            console.error('فشل قراءة الحافظة: ', err);
        });
    });
}

// إضافة دالة إظهار الإشعارات
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// استدعاء الوظائف عند تحميل الصفحة
window.addEventListener('load', () => {
    initializeClipboardFunctions();
    initializeAddMovieForm();
});

// تهيئة نموذج إضافة الأفلام
function initializeAddMovieForm() {
    const form = {
        url: document.getElementById('add-movie-url'),
        name: document.getElementById('add-movie-name'),
        category: document.getElementById('add-movie-category'),
        submit: document.getElementById('add-movie-submit')
    };

    // تعبئة قائمة الأقسام
    populateAddMovieCategories();

    // معالجة السحب والإفلات للرابط
    form.url.addEventListener('dragover', (e) => {
        e.preventDefault();
        form.url.classList.add('dragover');
    });

    form.url.addEventListener('dragleave', () => {
        form.url.classList.remove('dragover');
    });

    form.url.addEventListener('drop', (e) => {
        e.preventDefault();
        form.url.classList.remove('dragover');
        const url = e.dataTransfer.getData('text/plain');
        form.url.value = url;
    });

    // عند النقر على زر الإضافة
    form.submit.addEventListener('click', async () => {
        const movieUrl = form.url.value.trim();
        // تنسيق اسم الفيلم بإضافة كلمة "فيلم" في البداية إذا لم تكن موجودة
        let movieName = form.name.value.trim() || movieUrl;
        if (movieName && !movieName.startsWith('فيلم')) {
            movieName = `فيلم ${movieName}`;
        }
        const categoryId = form.category.value;

        if (!movieUrl) {
            showNotification('يرجى إدخال رابط الفيلم');
            return;
        }

        if (!categoryId) {
            showNotification('يرجى اختيار القسم');
            return;
        }

        // التحقق مما إذا كان القسم المحدد فرعيًا
        const isSubCategory = appState.categories.sub.some(cat => cat.id === categoryId) ||
                            appState.categories.specialSub.some(cat => cat.id === categoryId);

        // إنشاء كائن الفيلم الجديد
        const newMovie = {
            id: generateUniqueId(),
            name: movieName,
            href: movieUrl,
            img: '',
            category: isSubCategory ? 'all' : categoryId, // إذا كان قسم فرعي، نضعه في 'all'
            addedDate: new Date().toISOString(),
            subCategories: isSubCategory ? [categoryId] : [], // إذا كان قسم فرعي، نضيفه هنا
            specialSubCategories: []
        };

        // إضافة الفيلم إلى المصفوفة
        appState.movies.push(newMovie);

        // حفظ التغييرات
        await saveAppData();
        
        // تحديث العرض
        updateCategoriesCounts();
        renderCategories();
        if (appState.currentCategory === categoryId || appState.currentCategory === 'all') {
            displayMovies(appState.currentCategory);
        }

        // إظهار رسالة النجاح
        showNotification('تم إضافة الفيلم بنجاح');

        // إعادة تعيين النموذج
        form.url.value = '';
        form.name.value = '';
    });
}

// تعبئة قائمة الأقسام في نموذج الإضافة
function populateAddMovieCategories() {
    const select = document.getElementById('add-movie-category');
    if (!select) return;

    select.innerHTML = '<option value="">اختر القسم</option>';

    const addOptionsGroup = (categories, groupLabel) => {
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        
        categories.forEach(category => {
            if (!category.isSites && !category.isPagesSection && !category.hidden) {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                group.appendChild(option);
            }
        });

        if (group.children.length > 0) {
            select.appendChild(group);
        }
    };

    // إضافة الأقسام الرئيسية (باستثناء 'all' و'movie-sites')
    addOptionsGroup(
        appState.categories.main.filter(cat => cat.id !== 'all' && cat.id !== 'movie-sites'),
        'الأقسام العامة الرئيسية'
    );

    // إضافة الأقسام الفرعية
    addOptionsGroup(appState.categories.sub, 'الأقسام العامة الفرعية');

    // إضافة الأقسام الخاصة إذا كانت مرئية
    if (appState.showSpecialSections) {
        addOptionsGroup(appState.categories.special, 'الأقسام الخاصة الرئيسية');
        addOptionsGroup(appState.categories.specialSub, 'الأقسام الخاصة الفرعية');
    }
}


// تهيئة التخزين المحلي
const STORAGE_KEYS = {
    MOVIES: 'movies_data',
    SERIES: 'series_data',
    CATEGORIES: 'categories_data',
    SETTINGS: 'app_settings',
    PASSWORD: 'app_password',
    IMAGES: 'cached_images',
    DEFAULT_IMPORT_SPEED: 'movies_app_default_import_speed'
};

// إعدادات سرعة الاستيراد
const IMPORT_SPEED_SETTINGS = {
    slow: {
        batchSize: 50,
        timeout: 50,
        analyzeDelay: 100
    },
    medium: {
        batchSize: 100,
        timeout: 20,
        analyzeDelay: 50
    },
    fast: {
        batchSize: 200,
        timeout: 5,
        analyzeDelay: 10
    }
};

// تكوين القسم
const DEFAULT_CATEGORIES = {
    main: [
        { id: 'all', name: 'جميع الأفلام والمسلسلات', count: 0 },
        { id: 'old-arabic', name: 'أفلام عربية قديمة', count: 0 },
        { id: 'new-arabic', name: 'أفلام عربية جديدة', count: 0 },
        { id: 'series', name: 'المسلسلات', count: 0 },
        { id: 'foreign1', name: 'أفلام أجنبية 1', count: 0 },
        { id: 'foreign2', name: 'أفلام أجنبية 2', count: 0 },
        { id: 'foreign3', name: 'أفلام أجنبية 3', count: 0 },
        { id: 'horror', name: 'أفلام الرعب', count: 0 },
        { id: 'series-movies', name: 'سلاسل الأفلام', count: 0 },
        { id: 'stars', name: 'أفلام النجوم', count: 0 },
        { id: 'family', name: 'أفلام عائلية', count: 0 },
        { id: 'movie-sites', name: 'مواقع الأفلام', count: 0, isSites: true, shortcuts: [], folders: [] },
        { id: 'pages-section', name: 'قسم الصفحات', count: 0, isPagesSection: true, pages: [] }
    ],
    sub: [
        { id: 'selected1', name: 'أفلام مختارة 1', count: 0 },
        { id: 'selected2', name: 'أفلام مختارة 2', count: 0 },
        { id: 'favorite1', name: 'مفضلة أفلام 1', count: 0 },
        { id: 'favorite2', name: 'مفضلة أفلام 2', count: 0 }
    ],
    special: [
        { id: 'r1', name: 'قسم الأفلام R1', count: 0 },
        { id: 'r2', name: 'قسم الأفلام R2', count: 0 },
        { id: 's1', name: 'قسم الأفلام S1', count: 0 },
        { id: 's2', name: 'قسم الأفلام S2', count: 0 },
        { id: 's3', name: 'قسم الاكس S3', count: 0 },
        { id: 's-sites', name: 'قسم S SITES', count: 0 }
    ],
    specialSub: [
        { id: 'selected-rs1', name: 'أفلام مختارة R+S1', count: 0 },
        { id: 'selected-rs2', name: 'أفلام مختارة R+S2', count: 0 }
    ]
};

// حالة التطبيق
const appState = {
    movies: [],
    series: [],
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    currentCategory: 'all',
    currentPage: 1,
    itemsPerPage: 50,
    viewMode: 'grid',
    sortBy: 'name',
    selectedSite: '',
    selectedStar: '',
    showSpecialSections: false,
    password: '5555',
    searchResults: [],
    cachedImages: {},
    inEditMode: false,
    openMoviesExternally: true,
    zoomLevel: 1, // إضافة مستوى التكبير
    currentPageTitle: 'New Koktil-aflam v25', // لحفظ عنوان الصفحة الحالي
    _loadedFromCloud: false // علامة للتحقق مما إذا كانت البيانات تم تحميلها من السحابة
};

// تهيئة localForage لتخزين البيانات
localforage.config({
    name: 'MoviesApp',
    version: 1.0,
    storeName: 'movies_app_store',
    description: 'تخزين بيانات تطبيق الأفلام والمسلسلات'
});

// تحميل البيانات من التخزين المحلي
async function loadAppData() {
    try {
        // التحقق مما إذا كانت البيانات قد تم تحميلها من السحابة بالفعل
        if (!appState._loadedFromCloud) {
            // تحميل كلمة المرور أولاً
            const savedPassword = await localforage.getItem(STORAGE_KEYS.PASSWORD);
            if (savedPassword) {
                appState.password = savedPassword;
            } else {
                await localforage.setItem(STORAGE_KEYS.PASSWORD, appState.password);
            }

            // تحميل الإعدادات
            const settings = await localforage.getItem(STORAGE_KEYS.SETTINGS);
            if (settings) {
                appState.showSpecialSections = settings.showSpecialSections;
                appState.viewMode = settings.viewMode || 'grid';
                appState.sortBy = settings.sortBy || 'name';
                appState.selectedSite = settings.selectedSite || '';
                appState.selectedStar = settings.selectedStar || '';
                appState.itemsPerPage = settings.itemsPerPage || 50;
                appState.openMoviesExternally = settings.openMoviesExternally || false;
                appState.zoomLevel = settings.zoomLevel || 1; // تحميل مستوى التكبير المحفوظ
            }

            // تحميل الأقسام
            const savedCategories = await localforage.getItem(STORAGE_KEYS.CATEGORIES);
            if (savedCategories) {
                appState.categories = savedCategories;

                // التأكد من وجود قسم مواقع الأفلام مع الخصائص المطلوبة
                const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
                if (movieSitesCat) {
                    // التأكد من وجود خاصية shortcuts
                    if (!movieSitesCat.shortcuts) {
                        movieSitesCat.shortcuts = [];
                    }
                    // التأكد من وجود خاصية isSites
                    if (!movieSitesCat.isSites) {
                        movieSitesCat.isSites = true;
                    }
                    // التأكد من وجود خاصية folders
                    if (!movieSitesCat.folders) {
                        movieSitesCat.folders = [];
                    }
                } else {
                    // إضافة قسم مواقع الأفلام إذا لم يكن موجوداً
                    appState.categories.main.push({
                        id: 'movie-sites',
                        name: 'مواقع الأفلام',
                        count: 0,
                        isSites: true,
                        shortcuts: [],
                        folders: []
                    });
                }
            }

            // تحميل الأفلام
            const savedMovies = await localforage.getItem(STORAGE_KEYS.MOVIES);
            if (savedMovies) {
                appState.movies = savedMovies;
            }

            // تحميل المسلسلات
            const savedSeries = await localforage.getItem(STORAGE_KEYS.SERIES);
            if (savedSeries) {
                appState.series = savedSeries;
            }

            // تحميل الصور المخبأة
            const cachedImages = await localforage.getItem(STORAGE_KEYS.IMAGES);
            if (cachedImages) {
                appState.cachedImages = cachedImages;
            }
        }

        // تحديث عدادات الأقسام
        updateCategoriesCounts();
        renderCategories();

        // عرض الأفلام الافتراضية
        displayMovies('all', 1); // هنا نريد الانتقال للأعلى عند تحميل التطبيق

        // إخفاء/إظهار الأقسام الخاصة بناءً على الإعدادات
        toggleSpecialSectionsVisibility();

        // تطبيق مستوى التكبير المحفوظ
        applyZoom();

        console.log('تم تحميل بيانات التطبيق بنجاح');
    } catch (error) {
        console.error('خطأ أثناء تحميل بيانات التطبيق:', error);
    }
}

// حفظ بيانات التطبيق
// دالة لتحميل البيانات من JSONBin
async function loadFromJSONBin() {
    try {
        // تحميل البيانات من JSONBin
        const data = await loadFromJSONBinService();
        
        // دمج البيانات مع البيانات الحالية
        const mergedData = mergeData(appState, data);
        
        // تحديث التطبيق بالبيانات المدمجة
        appState.movies = mergedData.movies;
        appState.series = mergedData.series;
        appState.categories = mergedData.categories;

        // تعيين علامة للإشارة إلى أن البيانات تم تحميلها من السحابة
        appState._loadedFromCloud = true;
        
        // تحديث العرض
        updateCategoriesCounts();
        renderCategories();
        displayMovies('all');
        
        console.log('تم تحديث البيانات بنجاح من JSONBin');
        showToast('تم تحديث البيانات من السحابة بنجاح');
    } catch (error) {
        console.error('خطأ أثناء تحميل البيانات من JSONBin:', error);
        showToast('حدث خطأ أثناء تحديث البيانات من السحابة', 'error');
    }
}

async function saveAppData() {
    try {
        // الحفظ في التخزين المحلي (الكود الحالي)
        await localforage.setItem(STORAGE_KEYS.MOVIES, appState.movies);
        await localforage.setItem(STORAGE_KEYS.SERIES, appState.series);
        await localforage.setItem(STORAGE_KEYS.CATEGORIES, appState.categories);
        await localforage.setItem(STORAGE_KEYS.PASSWORD, appState.password);

        const settings = {
            showSpecialSections: appState.showSpecialSections,
            viewMode: appState.viewMode,
            sortBy: appState.sortBy,
            selectedSite: appState.selectedSite,
            selectedStar: appState.selectedStar,
            itemsPerPage: appState.itemsPerPage,
            openMoviesExternally: appState.openMoviesExternally,
            zoomLevel: appState.zoomLevel // حفظ مستوى التكبير
        };

        await localforage.setItem(STORAGE_KEYS.SETTINGS, settings);

        // إعداد بيانات JSONBin
        const dataForJSONBin = {
            version: "1.0",
            lastUpdated: new Date().toISOString(),
            movies: appState.movies,
            series: appState.series,
            categories: appState.categories,
            settings: {
                password: appState.password,
                showSpecialSections: appState.showSpecialSections,
                viewMode: appState.viewMode,
                sortBy: appState.sortBy,
                selectedSite: appState.selectedSite,
                selectedStar: appState.selectedStar,
                itemsPerPage: appState.itemsPerPage,
                openMoviesExternally: appState.openMoviesExternally,
                zoomLevel: appState.zoomLevel,
                currentPageTitle: appState.currentPageTitle,
                authRemember: false,
                authExpiry: 0
            }
        };

        // الحفظ في JSONBin
        await saveToJSONBin(dataForJSONBin);
        console.log('تم حفظ البيانات بنجاح إلى JSONBin');
    } catch (error) {
        console.error('خطأ أثناء حفظ البيانات:', error);
        showToast('حدث خطأ أثناء حفظ البيانات', 'error');
    }
}

// حفظ الصور المخبأة
async function saveCachedImages() {
    try {
        await localforage.setItem(STORAGE_KEYS.IMAGES, appState.cachedImages);
    } catch (error) {
        console.error('خطأ أثناء حفظ الصور المخبأة:', error);
    }
}

// تحديث عدادات الأقسام
function updateCategoriesCounts() {
    // إعادة تعيين العدادات
    appState.categories.main.forEach(category => category.count = 0);
    appState.categories.sub.forEach(category => category.count = 0);
    appState.categories.special.forEach(category => category.count = 0);
    appState.categories.specialSub.forEach(category => category.count = 0);

    // عد الأفلام والمسلسلات في كل قسم
    [...appState.movies, ...appState.series].forEach(item => {
        if (item.category && !item.hidden) {
            const categoryType = getCategoryType(item.category);
            if (categoryType) {
                const category = appState.categories[categoryType].find(cat => cat.id === item.category);
                if (category) {
                    category.count++;
                }
            }
        }
    });

    // عد جميع المسلسلات غير المخفية في قسم المسلسلات
    const seriesCount = appState.series.filter(series => !series.hidden).length;
    const seriesCategory = appState.categories.main.find(cat => cat.id === 'series');
    if (seriesCategory) {
        seriesCategory.count = seriesCount;
    }

    // تحديث عدد اختصارات المواقع في قسم مواقع الأفلام
    const movieSitesCategory = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (movieSitesCategory) {
        // حساب عدد المواقع في القائمة الرئيسية والمجلدات
        const shortcutsCount = movieSitesCategory.shortcuts ? movieSitesCategory.shortcuts.length : 0;
        const foldersCount = movieSitesCategory.folders ?
            movieSitesCategory.folders.reduce((total, folder) => total + (folder.sites ? folder.sites.length : 0), 0) : 0;
        movieSitesCategory.count = shortcutsCount + foldersCount;
    }

    // تحديث عدد "جميع الأفلام والمسلسلات"
    const totalGeneralMoviesCount = appState.movies.filter(movie => !movie.hidden && (
        appState.categories.main.some(cat => cat.id === movie.category) ||
        appState.categories.sub.some(cat => cat.id === movie.category)
    )).length;
    const totalSeriesCount = appState.series.filter(series => !series.hidden).length;
    const allCategory = appState.categories.main.find(cat => cat.id === 'all');
    if (allCategory) {
        allCategory.count = totalGeneralMoviesCount + totalSeriesCount;
    }

    // تحديث عد الأفلام في الأقسام الفرعية (حساب مستقل بدون تكرار)
    updateSubcategoriesCounts();
}

// تحديث عدادات الأقسام الفرعية بحساب مستقل (بدون تكرار)
function updateSubcategoriesCounts() {
    // إعادة تعيين عدادات الأقسام الفرعية
    appState.categories.sub.forEach(category => category.count = 0);
    appState.categories.specialSub.forEach(category => category.count = 0);

    // جمع جميع الأفلام والمسلسلات
    const allMovies = [...appState.movies, ...appState.series];

    // إنشاء مجموعة من الأفلام الفريدة لكل قسم فرعي
    const subcategoryMovies = new Map();

    // تجميع الأفلام حسب الأقسام الفرعية
    allMovies.forEach(item => {
        if (!item.hidden) {
            // التعامل مع الأقسام الفرعية
            if (item.subCategories) {
                // التعامل مع القيم المفردة والمصفوفات
                const subCats = Array.isArray(item.subCategories) ? 
                    item.subCategories : [item.subCategories];
                
                subCats.forEach(subCat => {
                    if (subCat) {  // التأكد من أن القيمة غير فارغة
                        if (!subcategoryMovies.has(subCat)) {
                            subcategoryMovies.set(subCat, new Set());
                        }
                        subcategoryMovies.get(subCat).add(item.id);
                    }
                });
            }

            // التعامل مع الأقسام الفرعية الخاصة
            if (item.specialSubCategories) {
                const specialSubCats = Array.isArray(item.specialSubCategories) ? 
                    item.specialSubCategories : [item.specialSubCategories];
                
                specialSubCats.forEach(subCat => {
                    if (subCat) {  // التأكد من أن القيمة غير فارغة
                        if (!subcategoryMovies.has(subCat)) {
                            subcategoryMovies.set(subCat, new Set());
                        }
                        subcategoryMovies.get(subCat).add(item.id);
                    }
                });
            }
        }
    });

    // تحديث العدادات بناءً على الأفلام الفريدة
    subcategoryMovies.forEach((movieIds, subcategoryId) => {
        const subCategoryType = getCategoryType(subcategoryId);
        if (subCategoryType) {
            const category = appState.categories[subCategoryType].find(cat => cat.id === subcategoryId);
            if (category) {
                category.count = movieIds.size; // عدد الأفلام الفريدة
            }
        }
    });
}

// تحديد نوع القسم (رئيسي، فرعي، خاص، خاص فرعي)
function getCategoryType(categoryId) {
    if (appState.categories.main.some(cat => cat.id === categoryId)) {
        return 'main';
    } else if (appState.categories.sub.some(cat => cat.id === categoryId)) {
        return 'sub';
    } else if (appState.categories.special.some(cat => cat.id === categoryId)) {
        return 'special';
    } else if (appState.categories.specialSub.some(cat => cat.id === categoryId)) {
        return 'specialSub';
    }
    return null;
}

// عرض/إخفاء الأقسام الخاصة
function toggleSpecialSectionsVisibility() {
    const specialCategoriesEl = document.querySelector('.special-categories');
    const specialSubCategoriesEl = document.querySelector('.special-sub-categories');
    const dropzoneSection = document.getElementById('dropzone-section');

    if (appState.showSpecialSections) {
        specialCategoriesEl.classList.remove('hidden');
        specialSubCategoriesEl.classList.remove('hidden');
        if (appState.currentCategory === 's3' || appState.currentCategory === 's-sites') {
            dropzoneSection.classList.remove('hidden');
        }
    } else {
        specialCategoriesEl.classList.add('hidden');
        specialSubCategoriesEl.classList.add('hidden');
        dropzoneSection.classList.add('hidden');
    }
}

// عرض الأقسام في واجهة المستخدم
function renderCategories() {
    const mainCategoriesList = document.getElementById('main-categories-list');
    const subCategoriesList = document.getElementById('sub-categories-list');
    const specialCategoriesList = document.getElementById('special-categories-list');
    const specialSubCategoriesList = document.getElementById('special-sub-categories-list');

    // تفريغ القوائم
    mainCategoriesList.innerHTML = '';
    subCategoriesList.innerHTML = '';
    specialCategoriesList.innerHTML = '';
    specialSubCategoriesList.innerHTML = '';

    // عرض الأقسام الرئيسية (فقط غير المخفية)
    appState.categories.main.filter(category => !category.hidden).forEach(category => {
        const li = document.createElement('li');
        li.dataset.category = category.id;
        li.innerHTML = `${category.name} <span class="counter">${category.count}</span>`;

        if (category.id === appState.currentCategory) {
            li.classList.add('active');
        }

        // تمييز قسم مواقع الأفلام بلون خاص
        if (category.id === 'movie-sites') {
            li.classList.add('movie-sites-category');
        }

        li.addEventListener('click', () => {
            displayMovies(category.id, 1);
        });

        // زر إضافة اختصار موقع للأقسام من نوع مواقع الأفلام
        if (category.id === 'movie-sites') {
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.gap = '5px';
            buttonsContainer.style.marginRight = '10px';

            const addShortcutBtn = document.createElement('button');
            addShortcutBtn.textContent = 'إضافة موقع';
            addShortcutBtn.className = 'btn secondary';
            addShortcutBtn.onclick = (e) => {
                e.stopPropagation();
                const url = prompt('أدخل رابط الموقع:');
                if (url && url.trim()) {
                    const name = prompt('اسم الموقع (اختياري):') || url;
                    category.shortcuts = category.shortcuts || [];
                    category.shortcuts.push({ name, url });
                    saveAppData();
                    updateCategoriesCounts();
                    renderCategories();
                }
            };

            const addFolderBtn = document.createElement('button');
            addFolderBtn.textContent = 'إضافة مجلد';
            addFolderBtn.className = 'btn secondary';
            addFolderBtn.onclick = (e) => {
                e.stopPropagation();
                const folderName = prompt('أدخل اسم المجلد:');
                if (folderName && folderName.trim()) {
                    createSiteFolder(folderName);
                }
            };

            buttonsContainer.appendChild(addShortcutBtn);
            buttonsContainer.appendChild(addFolderBtn);
            li.appendChild(buttonsContainer);
        }

        mainCategoriesList.appendChild(li);
    });

    // عرض الأقسام الفرعية
    appState.categories.sub.forEach(category => {
        const li = document.createElement('li');
        li.dataset.category = category.id;
        li.innerHTML = `${category.name} <span class="counter">${category.count}</span>`;

        if (category.id === appState.currentCategory) {
            li.classList.add('active');
        }

        li.addEventListener('click', () => {
            displayMovies(category.id, 1);
        });

        subCategoriesList.appendChild(li);
    });

    // عرض الأقسام الخاصة الرئيسية (فقط غير المخفية)
    appState.categories.special.filter(category => !category.hidden).forEach(category => {
        const li = document.createElement('li');
        li.dataset.category = category.id;
        li.innerHTML = `${category.name} <span class="counter">${category.count}</span>`;

        if (category.id === appState.currentCategory) {
            li.classList.add('active');
        }

        li.addEventListener('click', () => {
            displayMovies(category.id, 1);
            // عرض منطقة السحب والإفلات إذا كان القسم هو S3 أو S SITES
            const dropzoneSection = document.getElementById('dropzone-section');
            if ((category.id === 's3' || category.id === 's-sites') && appState.showSpecialSections) {
                dropzoneSection.classList.remove('hidden');
            } else {
                dropzoneSection.classList.add('hidden');
            }
        });

        specialCategoriesList.appendChild(li);
    });

    // عرض الأقسام الخاصة الفرعية
    appState.categories.specialSub.forEach(category => {
        const li = document.createElement('li');
        li.dataset.category = category.id;
        li.innerHTML = `${category.name} <span class="counter">${category.count}</span>`;

        if (category.id === appState.currentCategory) {
            li.classList.add('active');
        }

        li.addEventListener('click', () => {
            displayMovies(category.id);
        });

        specialSubCategoriesList.appendChild(li);
    });

    // تحديث سلاسل الاختيار في مختلف أجزاء التطبيق
    updateCategorySelectOptions();
}

// تحديث خيارات الأقسام في جميع القوائم المنسدلة
function updateCategorySelectOptions() {
    const selects = [
        document.getElementById('movie-category'),
        document.getElementById('edit-movie-category'),
        document.getElementById('import-category'),
        document.getElementById('manage-category-select'),
        document.getElementById('filter-category'),
        document.getElementById('target-category-select')
    ];

    selects.forEach(select => {
        if (select) {
            // حفظ القيمة الحالية
            const currentValue = select.value;
            select.innerHTML = '';

            // إضافة الأقسام الرئيسية
            const mainOptgroup = document.createElement('optgroup');
            mainOptgroup.label = 'الأقسام العامة الرئيسية';

            appState.categories.main.forEach(category => {
                if (category.id !== 'all') { // استثناء "جميع الأفلام والمسلسلات" من بعض القوائم
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    mainOptgroup.appendChild(option);
                }
            });

            select.appendChild(mainOptgroup);

            // إضافة الأقسام الفرعية العامة
            const subOptgroup = document.createElement('optgroup');
            subOptgroup.label = 'الأقسام العامة الفرعية';

            appState.categories.sub.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                subOptgroup.appendChild(option);
            });

            select.appendChild(subOptgroup);

            // إضافة الأقسام الخاصة الرئيسية
            if (appState.showSpecialSections) {
                const specialOptgroup = document.createElement('optgroup');
                specialOptgroup.label = 'الأقسام الخاصة الرئيسية';

                appState.categories.special.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    specialOptgroup.appendChild(option);
                });

                select.appendChild(specialOptgroup);

                // إضافة الأقسام الفرعية الخاصة
                const specialSubOptgroup = document.createElement('optgroup');
                specialSubOptgroup.label = 'الأقسام الخاصة الفرعية';

                appState.categories.specialSub.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    specialSubOptgroup.appendChild(option);
                });

                select.appendChild(specialSubOptgroup);
            }

            // إعادة تعيين القيمة المحددة إذا كانت موجودة
            if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
                select.value = currentValue;
            }
        }
    });

    // تحديث خيارات الأقسام الفرعية في مودال إضافة إلى قسم فرعي
    const subcategorySelect = document.getElementById('subcategory-select');
    if (subcategorySelect) {
        subcategorySelect.innerHTML = '';

        // التحقق من نوع القسم الحالي
        const isSpecialCategory = appState.categories.special.some(cat => cat.id === appState.currentCategory);
        const isRCategory = appState.currentCategory === 'r1' || appState.currentCategory === 'r2';

        if (isSpecialCategory) {
            // خيارات للأقسام الخاصة
            appState.categories.specialSub.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                subcategorySelect.appendChild(option);
            });
        } else if (isRCategory) {
            // خيارات لأقسام R مع خيارات إضافية
            [...appState.categories.sub, ...appState.categories.specialSub].forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                subcategorySelect.appendChild(option);
            });
        } else {
            // خيارات للأقسام العادية
            appState.categories.sub.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                subcategorySelect.appendChild(option);
            });
        }
    }
}

// عرض الأفلام في القسم المحدد
function displayMovies(categoryId, page = 1) {
    // منع الاستدعاءات المتكررة
    if (displayMovies._isRunning) return;
    displayMovies._isRunning = true;

    try {
        // التمرير فوراً عند بداية التحديث
        scrollToTopImmediate();

        appState.currentCategory = categoryId;
        appState.currentPage = page;

        _displayMoviesCore(categoryId, page);
    } catch (error) {
        console.error('خطأ في عرض الأفلام:', error);
    } finally {
        displayMovies._isRunning = false;
    }
}

// عرض الأفلام بدون التمرير إلى الأعلى
function displayMoviesWithoutScroll(categoryId, page = 1) {
    // منع الاستدعاءات المتكررة
    if (displayMoviesWithoutScroll._isRunning) return;
    displayMoviesWithoutScroll._isRunning = true;

    try {
        appState.currentCategory = categoryId;
        appState.currentPage = page;

        _displayMoviesCore(categoryId, page);
    } catch (error) {
        console.error('خطأ في عرض الأفلام:', error);
    } finally {
        displayMoviesWithoutScroll._isRunning = false;
    }
}

// الوظيفة الأساسية لعرض الأفلام
function _displayMoviesCore(categoryId, page) {
    // تحديث عنصر القسم النشط
    document.querySelectorAll('.categories-section li').forEach(li => {
        li.classList.remove('active');
        if (li.dataset.category === categoryId) {
            li.classList.add('active');
        }
    });

    // تحديث عنوان القسم الحالي
    const currentCategoryElement = document.getElementById('current-category');
    const categoryObj = [...appState.categories.main, ...appState.categories.sub,
                         ...appState.categories.special, ...appState.categories.specialSub]
                        .find(cat => cat.id === categoryId);

    if (categoryObj) {
        currentCategoryElement.textContent = categoryObj.name;
        // تحديث عنوان الصفحة في المتصفح
        const newTitle = `${categoryObj.name} - New Koktil-aflam v25`;
        document.title = newTitle;
        appState.currentPageTitle = newTitle;
    }

    // إظهار/إخفاء خيار الترتيب حسب النجم عندما يكون القسم الحالي هو أفلام النجوم
    const starSortOption = document.querySelector('.star-sort-option');
    if (starSortOption) {
        if (categoryId === 'stars') {
            starSortOption.classList.remove('hidden');
        } else {
            starSortOption.classList.add('hidden');
        }
    }

    // إعادة تعيين الفلاتر والترتيب عند تغيير القسم
    const oldCategory = appState.currentCategory;
    if (oldCategory !== categoryId) {
        appState.selectedSite = '';
        appState.selectedStar = '';
        // إعادة تعيين الترتيب إلى الترتيب حسب الاسم
        appState.sortBy = 'name';

        // تحديث القائمة المنسدلة للترتيب
        const sortSelect = document.getElementById('sort-options');
        if (sortSelect) {
            sortSelect.value = 'name';
        }

        // تحديث حقل الإدخال الرقمي للترتيب
        const sortInput = document.getElementById('sort-options-input');
        if (sortInput) {
            sortInput.value = '1';
        }

        // تحديث حقول الفلاتر
        const siteFilter = document.getElementById('site-filter');
        const starFilter = document.getElementById('star-filter');
        const siteInput = document.getElementById('site-filter-input');
        const starInput = document.getElementById('star-filter-input');

        if (siteFilter) siteFilter.value = '';
        if (starFilter) starFilter.value = '';
        if (siteInput) siteInput.value = '0';
        if (starInput) starInput.value = '0';
    }

    // تحديث رؤية خانات الفلترة
    updateFilterVisibility();

    // الحصول على الأفلام المناسبة للقسم

    let items = [];
    if (categoryId === 'all') {
        // جميع الأفلام والمسلسلات بناءً على إعدادات عرض الأقسام الخاصة
        items = [...appState.movies, ...appState.series].filter(item => {
            if (item.hidden) {
                return false;
            }

            const isMain = appState.categories.main.some(cat => cat.id === item.category);
            const isSub = appState.categories.sub.some(cat => cat.id === item.category);
            const isSpecial = appState.categories.special.some(cat => cat.id === item.category);
            const isSpecialSub = appState.categories.specialSub.some(cat => cat.id === item.category);

            if (!appState.showSpecialSections && (isSpecial || isSpecialSub)) {
                return false;
            }

            return isMain || isSub || isSpecial || isSpecialSub;
        });
    } else if (categoryId === 'series') {
        // المسلسلات فقط
        items = appState.series.filter(item => !item.hidden);
    } else if (categoryId === 'movie-sites') {
        // قسم مواقع الأفلام: عرض الاختصارات والمجلدات
        const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
        items = [];

        if (movieSitesCat) {
            // إضافة المجلدات أولاً (فقط المجلدات غير المخفية)
            if (movieSitesCat.folders && movieSitesCat.folders.length > 0) {
                movieSitesCat.folders.forEach((folder, folderIdx) => {
                    if (!folder.hidden) {
                        const sitesCount = folder.sites ? folder.sites.length : 0;
                        items.push({
                            id: 'folder-' + folder.id,
                            name: `${folder.name} (${sitesCount})`,
                            img: '', // يمكن إضافة أيقونة مجلد لاحقاً
                            href: '#',
                            category: 'movie-sites',
                            isFolder: true,
                            folder: folder,
                            sitesCount: sitesCount,
                            _folderIndex: folderIdx
                        });
                    }
                });
            }

            // إضافة المواقع في القائمة الرئيسية
            if (movieSitesCat.shortcuts && movieSitesCat.shortcuts.length > 0) {
                const shortcuts = movieSitesCat.shortcuts.map((shortcut, idx) => ({
                    id: 'site-' + idx,
                    name: shortcut.name || shortcut.title || shortcut.url,
                    img: shortcut.img || '',
                    href: shortcut.url,
                    category: 'movie-sites',
                    isSiteShortcut: true,
                    _shortcutIndex: idx
                }));
                items.push(...shortcuts);
            }
        }
    } else {
        // الأقسام الأخرى
        const isMainCategory = appState.categories.main.some(cat => cat.id === categoryId);
        const isSubCategory = appState.categories.sub.some(cat => cat.id === categoryId);
        const isSpecialSubCategory = appState.categories.specialSub.some(cat => cat.id === categoryId);

        if (isMainCategory) {
            // القسم الرئيسي - يشمل الأفلام والمسلسلات
            items = [...appState.movies, ...appState.series].filter(item => item.category === categoryId && !item.hidden);
        } else if (isSubCategory || isSpecialSubCategory) {
            // القسم الفرعي (عام أو خاص)
            items = [...appState.movies, ...appState.series].filter(item => {
                // التحقق من وجود الأفلام في الأقسام الفرعية
                const isInSubCategories = item.subCategories && 
                    (Array.isArray(item.subCategories) ? 
                        item.subCategories.includes(categoryId) : 
                        item.subCategories === categoryId);
                
                return isInSubCategories && !item.hidden;
            });
        } else {
            // الأقسام الخاصة (special) - يشمل الأفلام والمسلسلات
            const isSpecialCategory = appState.categories.special.some(cat => cat.id === categoryId);
            if (isSpecialCategory) {
                items = [...appState.movies, ...appState.series].filter(item => item.category === categoryId && !item.hidden);
            } else {
                // أقسام أخرى غير معروفة - يشمل الأفلام والمسلسلات
                items = [...appState.movies, ...appState.series].filter(item => item.category === categoryId && !item.hidden);
            }
        }
    }

    // ترتيب وفلترة الأفلام
    items = sortItems(items, appState.sortBy);
    items = applyFilters(items);

    // تقسيم الأفلام إلى صفحات
    const startIndex = (appState.currentPage - 1) * appState.itemsPerPage;
    const endIndex = startIndex + appState.itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    // عرض الأفلام في الواجهة
    renderMovies(paginatedItems, categoryId, startIndex);

    // تحديث أزرار الصفحات
    updatePagination(items.length);

    // تطبيق مستوى التكبير
    applyZoom();

    // تحديد ما إذا كان يجب إظهار منطقة السحب والإفلات
    const dropzoneSection = document.getElementById('dropzone-section');
    if ((categoryId === 's3' || categoryId === 's-sites') && appState.showSpecialSections) {
        dropzoneSection.classList.remove('hidden');
        console.log(`إظهار منطقة السحب والإفلات للقسم: ${categoryId}`);

        // إعادة تهيئة مناطق السحب والإفلات للتأكد من عملها
        setTimeout(() => {
            setupDropZones();
        }, 100);
    } else {
        dropzoneSection.classList.add('hidden');
        console.log(`إخفاء منطقة السحب والإفلات للقسم: ${categoryId}`);
    }

    // حفظ البيانات
    saveAppData();
}

// ترتيب العناصر (الأفلام/المسلسلات)
function sortItems(items, sortType) {
    const sortedItems = [...items];

    switch (sortType) {
        case 'name':
            sortedItems.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            break;
        case 'site':
            sortedItems.sort((a, b) => {
                // استخراج اسم الموقع من الرابط
                const getSite = (url) => {
                    if (!url) return '';
                    try {
                        const domain = new URL(url).hostname;
                        return domain;
                    } catch (e) {
                        return url;
                    }
                };

                const siteA = getSite(a.href);
                const siteB = getSite(b.href);
                return siteA.localeCompare(siteB, 'ar');
            });
            break;
        case 'date':
            // افتراض أن التاريخ الأحدث يأتي أولاً
            sortedItems.sort((a, b) => {
                const dateA = a.addedDate ? new Date(a.addedDate) : new Date(0);
                const dateB = b.addedDate ? new Date(b.addedDate) : new Date(0);
                return dateB - dateA;
            });
            break;
        case 'date-asc':
            // ترتيب تصاعدي حسب التاريخ (الأقدم أولاً)
            sortedItems.sort((a, b) => {
                const dateA = a.addedDate ? new Date(a.addedDate) : new Date(0);
                const dateB = b.addedDate ? new Date(b.addedDate) : new Date(0);
                return dateA - dateB;
            });
            break;
        case 'star':
            // فقط لقسم النجوم
            sortedItems.sort((a, b) => {
                const starA = a.starName || '';
                const starB = b.starName || '';
                return starA.localeCompare(starB, 'ar');
            });
            break;
    }

    return sortedItems;
}

// تحديث رؤية خانات الفلترة
function updateFilterVisibility() {
    const siteFilterContainer = document.getElementById('site-filter-container');
    const starFilterContainer = document.getElementById('star-filter-container');

    if (!siteFilterContainer || !starFilterContainer) return;

    // إخفاء جميع خانات الفلترة أولاً
    siteFilterContainer.classList.add('hidden');
    starFilterContainer.classList.add('hidden');

    // إظهار الخانة المناسبة حسب نوع الترتيب
    if (appState.sortBy === 'site') {
        siteFilterContainer.classList.remove('hidden');
        populateSiteFilterMain();
    } else if (appState.sortBy === 'star' && appState.currentCategory === 'stars') {
        starFilterContainer.classList.remove('hidden');
        populateStarFilter();
    }
}

// تعبئة خانة فلترة المواقع في الواجهة الرئيسية
function populateSiteFilterMain() {
    const siteFilter = document.getElementById('site-filter');
    if (!siteFilter) return;

    const currentValue = siteFilter.value;

    // تفريغ الخيارات
    siteFilter.innerHTML = '<option value="">جميع المواقع</option>';

    // استخدام Map لتخزين عدد الأفلام لكل موقع وما إذا كان الموقع خاصًا
    const sites = new Map();

    try {
        let items = [];
        if (appState.currentCategory === 'all') {
            items = [...appState.movies, ...appState.series].filter(item => !item.hidden);
        } else if (appState.currentCategory === 'series') {
            items = appState.series.filter(item => !item.hidden);
        } else {
            const isMainCategory = appState.categories.main.some(cat => cat.id === appState.currentCategory);
            const isSubCategory = appState.categories.sub.some(cat => cat.id === appState.currentCategory) ||
                                 appState.categories.specialSub.some(cat => cat.id === appState.currentCategory);

            if (isMainCategory) {
                items = appState.movies.filter(movie => movie.category === appState.currentCategory && !movie.hidden);
            } else if (isSubCategory) {
                items = [...appState.movies, ...appState.series].filter(item =>
                    item.subCategories &&
                    item.subCategories.includes(appState.currentCategory) &&
                    !item.hidden
                );
            } else {
                items = appState.movies.filter(movie => movie.category === appState.currentCategory && !movie.hidden);
            }
        }

        items.forEach(item => {
            if (item.href) {
                try {
                    const site = getSiteFromUrl(item.href);
                    if (site) {
                        const categoryType = getCategoryType(item.category);
                        const isSpecial = categoryType === 'special' || categoryType === 'specialSub';

                        if (!sites.has(site)) {
                            sites.set(site, { count: 0, isSpecial: isSpecial });
                        }
                        const siteData = sites.get(site);
                        siteData.count++;
                        // إذا كان الموقع يظهر في قسم خاص، نعتبره خاصًا
                        if (isSpecial) {
                            siteData.isSpecial = true;
                        }
                    }
                } catch (e) {
                    // تجاهل الروابط غير الصحيحة
                }
            }
        });

        // تحويل Map إلى مصفوفة وفلترة المواقع الخاصة إذا لزم الأمر
        let sitesArray = Array.from(sites.entries());

        if (!appState.showSpecialSections) {
            sitesArray = sitesArray.filter(([site, data]) => !data.isSpecial);
        }

        // ترتيب المواقع أبجديًا
        sitesArray.sort((a, b) => a[0].localeCompare(b[0]));

        // إضافة الخيارات مع عدد الأفلام
        sitesArray.forEach(([site, data], index) => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = `${index + 1}. ${site} (${data.count})`;
            siteFilter.appendChild(option);
        });

        // استعادة القيمة المحددة إذا كانت موجودة
        if (currentValue && Array.from(siteFilter.options).some(opt => opt.value === currentValue)) {
            siteFilter.value = currentValue;
        } else if (appState.selectedSite && Array.from(siteFilter.options).some(opt => opt.value === appState.selectedSite)) {
            siteFilter.value = appState.selectedSite;
        }
    } catch (error) {
        console.error('خطأ في تعبئة فلتر المواقع:', error);
    }
}

// تعبئة خانة فلترة النجوم
function populateStarFilter() {
    const starFilter = document.getElementById('star-filter');
    if (!starFilter) return;

    const currentValue = starFilter.value;

    // تفريغ الخيارات
    starFilter.innerHTML = '<option value="">جميع النجوم</option>';

    try {
        // الحصول على جميع أسماء النجوم الفريدة من أفلام النجوم
        const stars = new Set();

        const starsMovies = appState.movies.filter(movie => movie.category === 'stars' && !movie.hidden);
        starsMovies.forEach(movie => {
            if (movie.starName) {
                stars.add(movie.starName);
            }
        });

        // إضافة الخيارات مع أرقام
        const starsArray = Array.from(stars).sort();
        starsArray.forEach((star, index) => {
            const option = document.createElement('option');
            option.value = star;
            option.textContent = `${index + 1}. ${star}`;
            starFilter.appendChild(option);
        });

        // استعادة القيمة المحددة إذا كانت موجودة
        if (currentValue && Array.from(starFilter.options).some(opt => opt.value === currentValue)) {
            starFilter.value = currentValue;
        } else if (appState.selectedStar && Array.from(starFilter.options).some(opt => opt.value === appState.selectedStar)) {
            starFilter.value = appState.selectedStar;
        }
    } catch (error) {
        console.error('خطأ في تعبئة فلتر النجوم:', error);
    }
}

// تطبيق الفلاتر على الأفلام
function applyFilters(items) {
    let filteredItems = [...items];

    // فلترة حسب الموقع
    if (appState.selectedSite && appState.sortBy === 'site') {
        filteredItems = filteredItems.filter(item => {
            const site = getSiteFromUrl(item.href);
            return site === appState.selectedSite;
        });
    }

    // فلترة حسب النجم
    if (appState.selectedStar && appState.sortBy === 'star' && appState.currentCategory === 'stars') {
        filteredItems = filteredItems.filter(item => {
            return item.starName === appState.selectedStar;
        });
    }

    return filteredItems;
}

// تحديث أزرار الصفحات
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / appState.itemsPerPage);
    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const paginationControls = document.querySelector('.pagination-controls');

    // تحديث عناصر التنقل في الرأس أيضاً
    const headerCurrentPageElement = document.getElementById('header-current-page');
    const headerTotalPagesElement = document.getElementById('header-total-pages');
    const headerPrevButton = document.getElementById('header-prev-page');
    const headerNextButton = document.getElementById('header-next-page');

    currentPageElement.textContent = appState.currentPage;
    totalPagesElement.textContent = totalPages;
    headerCurrentPageElement.textContent = appState.currentPage;
    headerTotalPagesElement.textContent = totalPages;

    // تعطيل/تفعيل أزرار الصفحات
    prevButton.disabled = appState.currentPage <= 1;
    nextButton.disabled = appState.currentPage >= totalPages;
    headerPrevButton.disabled = appState.currentPage <= 1;
    headerNextButton.disabled = appState.currentPage >= totalPages;

    // إضافة مستمعي الأحداث للأزرار السفلية
    prevButton.onclick = () => {
        if (appState.currentPage > 1) {
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, appState.currentPage - 1);
        }
    };

    nextButton.onclick = () => {
        if (appState.currentPage < totalPages) {
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, appState.currentPage + 1);
        }
    };

    // إضافة مستمعي الأحداث للأزرار في الرأس
    headerPrevButton.onclick = () => {
        if (appState.currentPage > 1) {
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, appState.currentPage - 1);
        }
    };

    headerNextButton.onclick = () => {
        if (appState.currentPage < totalPages) {
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, appState.currentPage + 1);
        }
    };

    // إزالة أزرار الصفحات السابقة إذا وجدت
    const existingPageButtons = document.querySelectorAll('.page-number-btn');
    existingPageButtons.forEach(btn => btn.remove());

    // إضافة أزرار الصفحات (10 صفحات سابقة و10 صفحات تالية)
    if (totalPages > 1) {
        // تحديد نطاق الصفحات التي سيتم عرضها
        let startPage = Math.max(1, appState.currentPage - 10);
        let endPage = Math.min(totalPages, appState.currentPage + 10);

        // إنشاء أزرار الصفحات
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.classList.add('page-number-btn');
            pageButton.textContent = i;

            // تمييز الصفحة الحالية
            if (i === appState.currentPage) {
                pageButton.classList.add('current');
            }

            // إضافة مستمع الحدث للانتقال إلى الصفحة
            pageButton.addEventListener('click', () => {
                if (i !== appState.currentPage) {
                    // التمرير الفوري عند النقر
                    scrollToTopImmediate();
                    displayMovies(appState.currentCategory, i);
                }
            });

            // إضافة الزر بين زر السابق وزر التالي
            paginationControls.insertBefore(pageButton, nextButton);
        }
    }

    // إخفاء/إظهار أيقونات التنقل في الرأس حسب الحاجة
    updateHeaderNavigationVisibility(totalPages);
}

// دالة لإخفاء/إظهار أيقونات التنقل في الرأس
function updateHeaderNavigationVisibility(totalPages) {
    const headerNavigation = document.querySelector('.header-navigation');

    if (!headerNavigation) return;

    if (totalPages <= 1) {
        // إخفاء أيقونات التنقل إذا كانت هناك صفحة واحدة فقط أو لا توجد صفحات
        headerNavigation.style.display = 'none';
    } else {
        // إظهار أيقونات التنقل إذا كانت هناك أكثر من صفحة واحدة
        headerNavigation.style.display = 'flex';

        // إضافة تأثير انتقالي عند الظهور
        headerNavigation.style.opacity = '0';
        headerNavigation.style.transform = 'scale(0.8)';

        setTimeout(() => {
            headerNavigation.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            headerNavigation.style.opacity = '1';
            headerNavigation.style.transform = 'scale(1)';
        }, 50);
    }
}

// التمرير الفوري إلى أعلى الصفحة
function scrollToTopImmediate() {
    // التمرير الفوري لأعلى الصفحة
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

// التمرير إلى أعلى الصفحة
function scrollToTop() {
    // الحصول على منطقة المحتوى
    const contentSection = document.getElementById('content-section');
    const header = document.getElementById('app-header');

    if (contentSection && header) {
        // حساب الموقع المطلوب (أعلى منطقة المحتوى مع مراعاة ارتفاع الرأس)
        const headerHeight = header.offsetHeight;
        const targetPosition = contentSection.offsetTop - headerHeight - 10; // 10px مسافة إضافية

        // التمرير الفوري
        window.scrollTo(0, Math.max(0, targetPosition));

        // ثم التمرير السلس للتأكد
        setTimeout(() => {
            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
        }, 10);
    } else {
        // التمرير العادي إذا لم نجد العناصر
        scrollToTopImmediate();
    }
}

// عرض الأفلام في الواجهة
function renderMovies(items, categoryId, startIndex) {
    const container = document.getElementById('movies-container');

    // تحديد نمط العرض
    container.className = appState.viewMode === 'grid' ? 'grid-view' : 'list-view';

    // تفريغ الحاوية
    container.innerHTML = '';

    // التحقق مما إذا كان القسم هو الأفلام الخاصة R
    const isRCategory = categoryId === 'r1' || categoryId === 'r2';
    const isSpecialCategory = appState.categories.special.some(cat => cat.id === categoryId);
    const isSubCategory = appState.categories.sub.some(cat => cat.id === categoryId) ||
                         appState.categories.specialSub.some(cat => cat.id === categoryId);

    // إذا لم تكن هناك عناصر
    if (items.length === 0) {
        container.innerHTML = '<div class="no-items">لا توجد أفلام في هذا القسم</div>';
        return;
    }


    // عرض كل فيلم/مسلسل أو بطاقة موقع
    items.forEach((item, index) => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';

        // إضافة class خاص لبطاقات أفلام النجوم لإرجاعها للمقياس القديم
        if (categoryId === 'stars') {
            movieCard.classList.add('stars-category');
        }

        movieCard.dataset.id = item.id;

        // اسم الصورة من الرابط
        const imgFilename = getImageFilenameFromUrl(item.img);
        // استخدام الصورة المخبأة إذا كانت موجودة
        const imgSrc = appState.cachedImages[imgFilename] || item.img;

        // تحديد أزرار التحكم المناسبة بناءً على نوع القسم
        let favButtonHtml = '';
        if (isSubCategory) {
            // زر الحذف من القسم الفرعي
            favButtonHtml = `<button class="movie-remove-btn" data-id="${item.id}" data-subcategory="${categoryId}">
                                <i class="fas fa-trash-alt"></i>
                             </button>`;
        } else {
            // زر التمييز للإضافة إلى قسم فرعي
            const isFavorited = item.subCategories && item.subCategories.length > 0;
            favButtonHtml = `<button class="movie-favorite-btn ${isFavorited ? 'marked' : ''}" data-id="${item.id}">
                                <i class="fas fa-star"></i>
                             </button>`;
        }


        // أزرار إضافية (تشغيل/تعديل/حذف)
        let playBtnHtml = `<button class="movie-play-btn" data-id="${item.id}" data-href="${item.href}"><i class="fas fa-play"></i></button>`;
        let editBtnHtml = `<button class="movie-edit-btn" data-id="${item.id}"><i class="fas fa-ellipsis-v"></i></button>`;
        let deleteBtnHtml = `<button class="movie-delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>`;

        // إذا كان القسم هو مواقع الأفلام أو العنصر اختصار موقع، أضف زر زيارة الموقع فقط، واحتفظ بأزرار التعديل والحذف
        if (categoryId === 'movie-sites' || item.isSiteShortcut) {
            if (item.isFolder) {
                // بطاقة مجلد
                playBtnHtml = `<button class="folder-open-btn" data-folder-id="${item.folder.id}"><i class="fas fa-folder-open"></i></button>`;
            } else {
                // بطاقة موقع
                playBtnHtml = `
                    <button class="site-visit-internal-btn" data-id="${item.id}" data-url="${item.href}" data-name="${item.name.replace(/"/g, '&quot;')}" title="فتح داخل التطبيق">
                        <i class="fas fa-desktop"></i>
                    </button>
                    <button class="site-visit-external-btn" data-url="${item.href}" title="فتح خارجياً">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                `;

                // إضافة زر نقل إلى مجلد للمواقع في القائمة الرئيسية
                if (item.isSiteShortcut && typeof item._shortcutIndex !== 'undefined') {
                    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
                    if (movieSitesCat && movieSitesCat.folders && movieSitesCat.folders.length > 0) {
                        playBtnHtml += `<button class="move-to-folder-btn" data-site-index="${item._shortcutIndex}"><i class="fas fa-folder-plus"></i></button>`;
                    }
                }
            }
        }

        // تخصيص المحتوى حسب نوع العنصر
        if (item.isFolder) {
            // عرض المجلد
            const sitesCount = item.sitesCount || 0;
            const countBadgeClass = sitesCount === 0 ? 'empty' : sitesCount > 10 ? 'many' : '';

            movieCard.innerHTML = `
                <div class="movie-top-controls">
                    <span class="movie-number">${startIndex + index + 1}</span>
                    <div class="movie-edit-controls">
                        ${deleteBtnHtml}
                        ${editBtnHtml}
                    </div>
                </div>
                <div class="movie-image folder-icon">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="movie-details">
                    <h3>
                        <span class="folder-name">${item.folder.name}</span>
                        <span class="folder-count-badge ${countBadgeClass}">${sitesCount} مواقع</span>
                    </h3>
                    <div class="movie-site">مجلد مواقع</div>
                </div>
                <div class="movie-bottom-controls">
                    ${playBtnHtml}
                    ${favButtonHtml}
                </div>
            `;
        } else {
            // عرض الفيلم/المسلسل/الموقع العادي
            movieCard.innerHTML = `
                <div class="movie-top-controls">
                    <span class="movie-number">${startIndex + index + 1}</span>
                    <div class="movie-edit-controls">
                        ${deleteBtnHtml}
                        ${editBtnHtml}
                    </div>
                </div>
                <img src="${imgSrc || 'https://cdn-icons-png.flaticon.com/512/561/561127.png'}" alt="${item.name}" class="movie-image" onerror="this.src='https://cdn-icons-png.flaticon.com/512/561/561127.png'">
                <div class="movie-details">
                    <h3>${item.name}</h3>
                    <div class="movie-site">${getSiteFromUrl(item.href) || ''}</div>
                </div>
                <div class="movie-bottom-controls">
                    ${playBtnHtml}
                    ${favButtonHtml}
                </div>
            `;
        }

        // إضافة فئة CSS خاصة للمجلدات والمواقع
        if (categoryId === 'movie-sites' || item.isSiteShortcut) {
            if (item.isFolder) {
                movieCard.classList.add('folder-card');
            } else {
                movieCard.classList.add('site-shortcut-card');
            }
        }

        // إضافة إمكانية السحب والإفلات للمواقع في القائمة الرئيسية
        if (categoryId === 'movie-sites' && item.isSiteShortcut && typeof item._shortcutIndex !== 'undefined') {
            movieCard.draggable = true;
            movieCard.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'main-site',
                    siteIndex: item._shortcutIndex
                }));
                movieCard.style.opacity = '0.5';
            });

            movieCard.addEventListener('dragend', () => {
                movieCard.style.opacity = '1';
            });
        }

        // إضافة بطاقة الفيلم/الموقع إلى الحاوية
        container.appendChild(movieCard);

        // تحميل وتخزين الصورة محليًا إذا لم تكن موجودة بالفعل
        if (!appState.cachedImages[imgFilename] && item.img) {
            cacheImage(item.img, imgFilename);
        }
    });
    // زر فتح الموقع داخل التطبيق
    document.querySelectorAll('.site-visit-internal-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = button.dataset.url;
            const name = button.dataset.name;
            const id = button.dataset.id;
            if (url) {
                // إنشاء كائن موقع مؤقت
                const siteItem = {
                    id: id,
                    name: name,
                    href: url,
                    img: '',
                    category: 'movie-sites',
                    isMainSite: true
                };
                openSitePlayModal(siteItem);
            }
        });
    });

    // زر فتح الموقع خارجياً
    document.querySelectorAll('.site-visit-external-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = button.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
    });

    // زر نقل الموقع إلى مجلد
    document.querySelectorAll('.move-to-folder-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const siteIndex = parseInt(button.dataset.siteIndex);
            showFolderSelectionModal(siteIndex);
        });
    });

    // زر فتح المجلد
    document.querySelectorAll('.folder-open-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderId = button.dataset.folderId;
            showFolderContents(folderId);
        });
    });

    // إضافة مستمعي الأحداث
    addMovieCardEventListeners();

    // فرض إعادة رسم المحتوى
    container.offsetHeight;
}

// الحصول على اسم الملف من URL
function getImageFilenameFromUrl(url) {
    if (!url) return '';
    try {
        const filename = url.split('/').pop().split('?')[0];
        return filename || url;
    } catch (e) {
        return url;
    }
}

// تخزين الصورة محليًا
async function cacheImage(imageUrl, filename) {
    try {
        // استخدام الوكيل لتجاوز مشاكل CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const response = await fetch(proxyUrl + imageUrl);

        if (!response.ok) {
            // إذا فشلت محاولة الوكيل، جرب بدون وكيل
            const directResponse = await fetch(imageUrl, { mode: 'no-cors' });
            if (!directResponse.ok) throw new Error(`HTTP error! status: ${directResponse.status}`);

            // إذا تم تحميل الصورة بدون وكيل، استخدم الصورة الأصلية
            appState.cachedImages[filename] = imageUrl;
            saveCachedImages();
            return;
        }

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function() {
            appState.cachedImages[filename] = reader.result;
            saveCachedImages();
        };

        reader.readAsDataURL(blob);
    } catch (error) {
        console.error('Error caching image:', error);
        // إذا فشلت جميع المحاولات، استخدم الصورة الأصلية
        appState.cachedImages[filename] = imageUrl;
        saveCachedImages();
    }
}

// الحصول على اسم الموقع من URL
function getSiteFromUrl(url) {
    if (!url) return '';
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch (e) {
        return '';
    }
}

// إدارة مجلدات مواقع الأفلام
function createSiteFolder(folderName) {
    if (!folderName || !folderName.trim()) {
        showToast('يرجى إدخال اسم المجلد', 'warning');
        return;
    }

    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    // التحقق من عدم وجود مجلد بنفس الاسم
    if (movieSitesCat.folders.some(folder => folder.name === folderName.trim())) {
        showToast('يوجد مجلد بهذا الاسم بالفعل', 'warning');
        return;
    }

    // إنشاء المجلد الجديد
    const newFolder = {
        id: generateUniqueId(),
        name: folderName.trim(),
        sites: [],
        expanded: true
    };

    movieSitesCat.folders.push(newFolder);
    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم إنشاء مجلد "${folderName}" بنجاح`, 'success');
}

function deleteSiteFolder(folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folderIndex = movieSitesCat.folders.findIndex(folder => folder.id === folderId);
    if (folderIndex === -1) return;

    const folder = movieSitesCat.folders[folderIndex];

    // نقل المواقع من المجلد إلى القائمة الرئيسية
    if (folder.sites && folder.sites.length > 0) {
        movieSitesCat.shortcuts.push(...folder.sites);
    }

    // حذف المجلد
    movieSitesCat.folders.splice(folderIndex, 1);
    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم حذف مجلد "${folder.name}" ونقل محتوياته إلى القائمة الرئيسية`, 'success');
}

function renameSiteFolder(folderId, newName) {
    if (!newName || !newName.trim()) {
        showToast('يرجى إدخال اسم صحيح للمجلد', 'warning');
        return;
    }

    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(folder => folder.id === folderId);
    if (!folder) return;

    // التحقق من عدم وجود مجلد آخر بنفس الاسم
    if (movieSitesCat.folders.some(f => f.id !== folderId && f.name === newName.trim())) {
        showToast('يوجد مجلد بهذا الاسم بالفعل', 'warning');
        return;
    }

    folder.name = newName.trim();
    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم تغيير اسم المجلد إلى "${newName}" بنجاح`, 'success');
}

function toggleFolderExpansion(folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(folder => folder.id === folderId);
    if (!folder) return;

    folder.expanded = !folder.expanded;
    saveAppData();
    renderCategories();
}

function moveSiteToFolder(siteIndex, folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    if (siteIndex < 0 || siteIndex >= movieSitesCat.shortcuts.length) return;

    const site = movieSitesCat.shortcuts[siteIndex];
    const folder = movieSitesCat.folders.find(f => f.id === folderId);

    if (!folder) return;

    // التحقق من عدم وجود الموقع في المجلد مسبقاً
    const siteUrl = site.url || site.href;
    const siteName = site.name || site.title;

    const isDuplicate = folder.sites.some(existingSite => {
        const existingUrl = existingSite.url || existingSite.href;
        const existingName = existingSite.name || existingSite.title;

        // التحقق من التطابق بالرابط أو الاسم
        return (siteUrl && existingUrl && siteUrl === existingUrl) ||
               (siteName && existingName && siteName === existingName);
    });

    if (isDuplicate) {
        showToast(`الموقع "${siteName || siteUrl}" موجود بالفعل في مجلد "${folder.name}"`, 'warning');
        return;
    }

    // نقل الموقع من القائمة الرئيسية إلى المجلد
    movieSitesCat.shortcuts.splice(siteIndex, 1);
    folder.sites.push(site);

    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم نقل الموقع إلى مجلد "${folder.name}" بنجاح`, 'success');
}

function moveSiteFromFolder(folderId, siteIndex) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder || siteIndex < 0 || siteIndex >= folder.sites.length) return;

    const site = folder.sites[siteIndex];

    // نقل الموقع من المجلد إلى القائمة الرئيسية
    folder.sites.splice(siteIndex, 1);
    movieSitesCat.shortcuts.push(site);

    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم نقل الموقع من مجلد "${folder.name}" إلى القائمة الرئيسية`, 'success');
}

// إضافة موقع جديد للمجلد مع منع التكرار
function addNewSiteToFolder(folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder) return;

    // طلب بيانات الموقع الجديد
    const siteName = prompt('أدخل اسم الموقع:');
    if (!siteName || !siteName.trim()) {
        showToast('يجب إدخال اسم الموقع', 'warning');
        return;
    }

    const siteUrl = prompt('أدخل رابط الموقع:');
    if (!siteUrl || !siteUrl.trim()) {
        showToast('يجب إدخال رابط الموقع', 'warning');
        return;
    }

    // التحقق من صحة الرابط
    try {
        new URL(siteUrl.trim());
    } catch (e) {
        showToast('رابط الموقع غير صحيح', 'error');
        return;
    }

    const trimmedName = siteName.trim();
    const trimmedUrl = siteUrl.trim();

    // التحقق من عدم وجود الموقع في المجلد مسبقاً
    const isDuplicate = folder.sites.some(existingSite => {
        const existingUrl = existingSite.url || existingSite.href;
        const existingName = existingSite.name || existingSite.title;

        // التحقق من التطابق بالرابط أو الاسم
        return (existingUrl && existingUrl === trimmedUrl) ||
               (existingName && existingName === trimmedName);
    });

    if (isDuplicate) {
        showToast(`الموقع "${trimmedName}" موجود بالفعل في مجلد "${folder.name}"`, 'warning');
        return;
    }

    // التحقق من عدم وجود الموقع في القائمة الرئيسية
    const isInMainList = movieSitesCat.shortcuts.some(existingSite => {
        const existingUrl = existingSite.url || existingSite.href;
        const existingName = existingSite.name || existingSite.title;

        return (existingUrl && existingUrl === trimmedUrl) ||
               (existingName && existingName === trimmedName);
    });

    if (isInMainList) {
        const moveFromMain = confirm(`الموقع "${trimmedName}" موجود في القائمة الرئيسية.\nهل تريد نقله إلى المجلد بدلاً من إنشاء نسخة جديدة؟`);

        if (moveFromMain) {
            // العثور على الموقع في القائمة الرئيسية ونقله
            const siteIndex = movieSitesCat.shortcuts.findIndex(site => {
                const existingUrl = site.url || site.href;
                const existingName = site.name || site.title;
                return (existingUrl && existingUrl === trimmedUrl) ||
                       (existingName && existingName === trimmedName);
            });

            if (siteIndex !== -1) {
                moveSiteToFolder(siteIndex, folderId);
                return;
            }
        } else {
            return; // المستخدم ألغى العملية
        }
    }

    // إضافة الموقع الجديد للمجلد
    const newSite = {
        name: trimmedName,
        url: trimmedUrl,
        href: trimmedUrl, // للتوافق مع الإصدارات القديمة
        dateAdded: new Date().toISOString()
    };

    folder.sites.push(newSite);

    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم إضافة الموقع "${trimmedName}" إلى مجلد "${folder.name}" بنجاح`, 'success');

    // إعادة فتح المجلد لعرض الموقع الجديد
    setTimeout(() => {
        showFolderContents(folderId);
    }, 500);
}

// تنظيف المواقع المكررة في جميع المجلدات
function cleanupDuplicateSitesInFolders() {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat || !movieSitesCat.folders) return;

    let totalRemoved = 0;
    let foldersAffected = 0;

    movieSitesCat.folders.forEach(folder => {
        if (!folder.sites || folder.sites.length <= 1) return;

        const originalCount = folder.sites.length;
        const uniqueSites = [];
        const seenUrls = new Set();
        const seenNames = new Set();

        folder.sites.forEach(site => {
            const siteUrl = site.url || site.href;
            const siteName = site.name || site.title;

            // التحقق من التكرار بالرابط أو الاسم
            const isDuplicateUrl = siteUrl && seenUrls.has(siteUrl);
            const isDuplicateName = siteName && seenNames.has(siteName);

            if (!isDuplicateUrl && !isDuplicateName) {
                uniqueSites.push(site);
                if (siteUrl) seenUrls.add(siteUrl);
                if (siteName) seenNames.add(siteName);
            }
        });

        if (uniqueSites.length < originalCount) {
            folder.sites = uniqueSites;
            const removedCount = originalCount - uniqueSites.length;
            totalRemoved += removedCount;
            foldersAffected++;
            console.log(`تم إزالة ${removedCount} موقع مكرر من مجلد "${folder.name}"`);
        }
    });

    if (totalRemoved > 0) {
        saveAppData();
        updateCategoriesCounts();
        renderCategories();

        if (appState.currentCategory === 'movie-sites') {
            displayMovies('movie-sites', appState.currentPage);
        }

        showToast(`تم تنظيف ${totalRemoved} موقع مكرر من ${foldersAffected} مجلد`, 'success');
    } else {
        showToast('لا توجد مواقع مكررة في المجلدات', 'info');
    }
}

// تنظيف المواقع المكررة في مجلد محدد
function cleanupDuplicateSitesInFolder(folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder || !folder.sites || folder.sites.length <= 1) return;

    const originalCount = folder.sites.length;
    const uniqueSites = [];
    const seenUrls = new Set();
    const seenNames = new Set();

    folder.sites.forEach(site => {
        const siteUrl = site.url || site.href;
        const siteName = site.name || site.title;

        // التحقق من التكرار بالرابط أو الاسم
        const isDuplicateUrl = siteUrl && seenUrls.has(siteUrl);
        const isDuplicateName = siteName && seenNames.has(siteName);

        if (!isDuplicateUrl && !isDuplicateName) {
            uniqueSites.push(site);
            if (siteUrl) seenUrls.add(siteUrl);
            if (siteName) seenNames.add(siteName);
        }
    });

    if (uniqueSites.length < originalCount) {
        folder.sites = uniqueSites;
        const removedCount = originalCount - uniqueSites.length;

        saveAppData();
        updateCategoriesCounts();
        renderCategories();

        if (appState.currentCategory === 'movie-sites') {
            displayMovies('movie-sites', appState.currentPage);
        }

        showToast(`تم إزالة ${removedCount} موقع مكرر من مجلد "${folder.name}"`, 'success');

        // إعادة فتح المجلد لعرض النتيجة
        setTimeout(() => {
            showFolderContents(folderId);
        }, 500);
    } else {
        showToast(`لا توجد مواقع مكررة في مجلد "${folder.name}"`, 'info');
    }
}

function moveSiteBetweenFolders(sourceFolderId, siteIndex, targetFolderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const sourceFolder = movieSitesCat.folders.find(f => f.id === sourceFolderId);
    const targetFolder = movieSitesCat.folders.find(f => f.id === targetFolderId);

    if (!sourceFolder || !targetFolder || siteIndex < 0 || siteIndex >= sourceFolder.sites.length) return;

    const site = sourceFolder.sites[siteIndex];

    // التحقق من عدم وجود الموقع في المجلد الهدف مسبقاً
    const siteUrl = site.url || site.href;
    const siteName = site.name || site.title;

    const isDuplicate = targetFolder.sites.some(existingSite => {
        const existingUrl = existingSite.url || existingSite.href;
        const existingName = existingSite.name || existingSite.title;

        // التحقق من التطابق بالرابط أو الاسم
        return (siteUrl && existingUrl && siteUrl === existingUrl) ||
               (siteName && existingName && siteName === existingName);
    });

    if (isDuplicate) {
        showToast(`الموقع "${siteName || siteUrl}" موجود بالفعل في مجلد "${targetFolder.name}"`, 'warning');
        return;
    }

    // نقل الموقع من المجلد المصدر إلى المجلد الهدف
    sourceFolder.sites.splice(siteIndex, 1);
    targetFolder.sites.push(site);

    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم نقل الموقع من مجلد "${sourceFolder.name}" إلى مجلد "${targetFolder.name}"`, 'success');
}

// عرض نافذة اختيار المجلد
function showFolderSelectionModal(siteIndex) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat || !movieSitesCat.folders || movieSitesCat.folders.length === 0) {
        showToast('لا توجد مجلدات متاحة. قم بإنشاء مجلد أولاً.', 'info');
        return;
    }

    // إنشاء نافذة منبثقة لاختيار المجلد
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.zIndex = '10000';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '400px';

    const title = document.createElement('h3');
    title.textContent = 'اختر المجلد لنقل الموقع إليه';
    title.style.marginBottom = '20px';

    const foldersList = document.createElement('div');
    foldersList.style.maxHeight = '300px';
    foldersList.style.overflowY = 'auto';
    foldersList.style.marginBottom = '20px';

    movieSitesCat.folders.forEach(folder => {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-selection-item';
        folderItem.style.cssText = `
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-bottom: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: background-color 0.2s;
        `;

        folderItem.innerHTML = `
            <i class="fas fa-folder" style="color: #ffa726; margin-left: 10px;"></i>
            <span>${folder.name}</span>
            <span style="margin-right: auto; color: #666;">(${folder.sites ? folder.sites.length : 0} مواقع)</span>
        `;

        folderItem.addEventListener('mouseenter', () => {
            folderItem.style.backgroundColor = '#f5f5f5';
        });

        folderItem.addEventListener('mouseleave', () => {
            folderItem.style.backgroundColor = 'transparent';
        });

        folderItem.addEventListener('click', () => {
            moveSiteToFolder(siteIndex, folder.id);
            document.body.removeChild(modal);
        });

        foldersList.appendChild(folderItem);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'إلغاء';
    cancelBtn.className = 'btn secondary';
    cancelBtn.style.width = '100%';
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modalContent.appendChild(title);
    modalContent.appendChild(foldersList);
    modalContent.appendChild(cancelBtn);
    modal.appendChild(modalContent);

    // إغلاق النافذة عند النقر خارجها
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    document.body.appendChild(modal);

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            createModalScrollbar(modalContent);
            console.log('✅ تم إضافة شريط التمرير لنافذة اختيار المجلد');
        }
    }, 100);
}

// عرض محتويات المجلد
function showFolderContents(folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder) return;

    // إنشاء نافذة منبثقة لعرض محتويات المجلد
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.zIndex = '10000';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '600px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';

    // إنشاء شريط علوي مع زر الإغلاق
    const topBar = document.createElement('div');
    topBar.className = 'folder-modal-top-bar';

    const title = document.createElement('h3');
    title.className = 'folder-modal-title';
    title.innerHTML = `<i class="fas fa-folder" style="color: white;"></i>${folder.name} (${folder.sites ? folder.sites.length : 0} مواقع)`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> إغلاق المجلد';
    closeBtn.className = 'folder-modal-close-btn';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    topBar.appendChild(title);
    topBar.appendChild(closeBtn);

    const header = document.createElement('div');
    header.className = 'folder-actions-header';

    const folderActions = document.createElement('div');
    folderActions.style.display = 'flex';
    folderActions.style.gap = '10px';

    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = '<i class="fas fa-edit"></i> إعادة تسمية';
    renameBtn.className = 'btn secondary';
    renameBtn.onclick = () => {
        const newName = prompt('أدخل الاسم الجديد للمجلد:', folder.name);
        if (newName && newName.trim()) {
            renameSiteFolder(folder.id, newName);
            document.body.removeChild(modal);
        }
    };

    const addSiteBtn = document.createElement('button');
    addSiteBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة موقع';
    addSiteBtn.className = 'btn primary';
    addSiteBtn.onclick = () => {
        addNewSiteToFolder(folder.id);
        document.body.removeChild(modal);
    };

    const cleanupBtn = document.createElement('button');
    cleanupBtn.innerHTML = '<i class="fas fa-broom"></i> تنظيف المكررات';
    cleanupBtn.className = 'btn warning';
    cleanupBtn.onclick = () => {
        cleanupDuplicateSitesInFolder(folder.id);
        document.body.removeChild(modal);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> حذف المجلد';
    deleteBtn.className = 'btn secondary';
    deleteBtn.onclick = () => {
        if (confirm(`هل أنت متأكد من حذف مجلد "${folder.name}"؟\nسيتم نقل محتوياته إلى القائمة الرئيسية.`)) {
            deleteSiteFolder(folder.id);
            document.body.removeChild(modal);
        }
    };

    folderActions.appendChild(addSiteBtn);
    folderActions.appendChild(cleanupBtn);
    folderActions.appendChild(renameBtn);
    folderActions.appendChild(deleteBtn);

    header.appendChild(title);
    header.appendChild(folderActions);

    const sitesContainer = document.createElement('div');
    sitesContainer.className = 'folder-sites-container';

    // إضافة عنوان للمواقع إذا كان هناك مواقع
    if (folder.sites && folder.sites.length > 0) {
        const sitesHeader = document.createElement('div');
        sitesHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        `;

        const sitesTitle = document.createElement('h4');
        sitesTitle.style.cssText = `
            margin: 0;
            color: #1565c0;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        sitesTitle.innerHTML = `<i class="fas fa-list"></i>المواقع (${folder.sites.length})`;

        const sortInfo = document.createElement('span');
        sortInfo.style.cssText = `
            font-size: 12px;
            color: #666;
            font-weight: normal;
        `;
        sortInfo.textContent = 'مرتبة حسب الإضافة';

        sitesHeader.appendChild(sitesTitle);
        sitesHeader.appendChild(sortInfo);
        sitesContainer.appendChild(sitesHeader);
    }

    if (folder.sites && folder.sites.length > 0) {
        folder.sites.forEach((site, siteIndex) => {
            const siteItem = document.createElement('div');
            siteItem.className = 'folder-site-card';
            siteItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px 16px;
                margin: 8px 0;
                background: linear-gradient(135deg, #f8f9ff, #f0f4ff);
                border: 1px solid #e3f2fd;
                border-radius: 8px;
                transition: all 0.3s ease;
                min-height: 56px;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
            `;

            siteItem.addEventListener('mouseenter', () => {
                siteItem.style.background = 'linear-gradient(135deg, #e8f4fd, #e1f5fe)';
                siteItem.style.borderColor = '#2196f3';
                siteItem.style.transform = 'translateY(-1px)';
                siteItem.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.2)';
            });

            siteItem.addEventListener('mouseleave', () => {
                siteItem.style.background = 'linear-gradient(135deg, #f8f9ff, #f0f4ff)';
                siteItem.style.borderColor = '#e3f2fd';
                siteItem.style.transform = 'translateY(0)';
                siteItem.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.1)';
            });

            // تحسين عرض الرابط
            const siteUrl = site.url || site.href || '';
            const displayUrl = siteUrl.length > 50 ? siteUrl.substring(0, 50) + '...' : siteUrl;

            siteItem.innerHTML = `
                <div class="folder-site-number">${siteIndex + 1}</div>
                <div class="folder-site-info">
                    <div class="folder-site-name">${site.name || 'موقع بدون اسم'}</div>
                    <div class="folder-site-url" title="${siteUrl}">${displayUrl}</div>
                </div>
                <div class="folder-site-actions" style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
                    <!-- أزرار الفتح -->
                    <button class="btn site-action-btn site-play-btn" onclick="openSiteInApp('${site.url}', '${(site.name || site.url).replace(/'/g, "\\'")}', '${folder.id}', ${siteIndex})" title="فتح داخل التطبيق">
                        <i class="fas fa-desktop"></i>
                    </button>
                    <button class="btn site-action-btn site-external-btn" onclick="window.open('${site.url}', '_blank')" title="فتح خارجياً">
                        <i class="fas fa-external-link-alt"></i>
                    </button>

                    <!-- فاصل -->
                    <div class="btn-separator"></div>

                    <!-- أزرار الترتيب -->
                    <button class="btn site-action-btn site-move-btn" onclick="moveSiteInFolder('${folder.id}', ${siteIndex}, ${siteIndex - 1}); document.body.removeChild(this.closest('.modal')); showFolderContents('${folder.id}')" title="نقل لأعلى" ${siteIndex === 0 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="btn site-action-btn site-move-btn" onclick="moveSiteInFolder('${folder.id}', ${siteIndex}, ${siteIndex + 1}); document.body.removeChild(this.closest('.modal')); showFolderContents('${folder.id}')" title="نقل لأسفل" ${siteIndex === folder.sites.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-down"></i>
                    </button>

                    <!-- فاصل -->
                    <div class="btn-separator"></div>

                    <!-- أزرار إضافية -->
                    <button class="btn site-action-btn site-sort-btn" onclick="changeSitePosition('${folder.id}', ${siteIndex})" title="تغيير الترتيب">
                        <i class="fas fa-sort-numeric-down"></i>
                    </button>
                    <button class="btn site-action-btn site-remove-btn" onclick="moveSiteFromFolder('${folder.id}', ${siteIndex}); document.body.removeChild(this.closest('.modal'))" title="نقل إلى القائمة الرئيسية">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                </div>
            `;

            sitesContainer.appendChild(siteItem);
        });
    } else {
        const emptyMessage = document.createElement('div');
        emptyMessage.style.cssText = `
            text-align: center;
            color: #666;
            padding: 60px 20px;
            border: 2px dashed #e0e0e0;
            border-radius: 12px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            margin: 20px 0;
        `;
        emptyMessage.innerHTML = `
            <div style="font-size: 48px; color: #ccc; margin-bottom: 15px;">
                <i class="fas fa-folder-open"></i>
            </div>
            <div style="font-size: 16px; font-weight: 600; color: #666; margin-bottom: 8px;">
                المجلد فارغ
            </div>
            <div style="font-size: 13px; color: #999; line-height: 1.5;">
                يمكنك إضافة مواقع جديدة باستخدام زر "إضافة موقع" أعلاه<br>
                أو نقل مواقع من القائمة الرئيسية
            </div>
        `;
        sitesContainer.appendChild(emptyMessage);
    }

    modalContent.appendChild(topBar);
    modalContent.appendChild(header);
    modalContent.appendChild(sitesContainer);
    modal.appendChild(modalContent);

    // إغلاق النافذة عند النقر خارجها
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    document.body.appendChild(modal);

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        createModalScrollbar(modalContent);
        console.log('✅ تم إضافة شريط التمرير لنافذة محتويات المجلد');
    }, 100);
}

// فتح موقع داخل التطبيق من المجلد
function openSiteInApp(url, siteName, folderId, siteIndex) {
    // إنشاء كائن مؤقت للموقع
    const siteItem = {
        id: `folder-site-${folderId}-${siteIndex}`,
        name: siteName,
        href: url,
        img: '', // يمكن إضافة صورة افتراضية للمواقع
        category: 'movie-sites',
        isFolderSite: true,
        folderId: folderId,
        siteIndex: siteIndex
    };

    // فتح الموقع في مودال التشغيل
    openSitePlayModal(siteItem);
}

// مودال خاص لتشغيل المواقع مع إمكانية إضافتها كأفلام
function openSitePlayModal(siteItem) {
    const modal = document.getElementById('play-movie-modal');
    const titleElement = document.getElementById('play-movie-title');
    const playerFrame = document.getElementById('movie-player');
    const addToSubcategoryBtn = document.getElementById('add-to-subcategory-from-player');

    titleElement.textContent = siteItem.name;

    // تحديث عنوان الصفحة
    const originalTitle = document.title;
    document.title = `تصفح: ${siteItem.name} - New Koktil-aflam v25`;

    // تحميل الموقع في iframe بشكل بسيط
    playerFrame.src = siteItem.href;

    // تعيين المتغيرات الأساسية
    window.currentIframeUrl = siteItem.href;
    window.currentIframeTitle = siteItem.name;

    console.log(`تم تحميل الموقع: ${siteItem.name} - ${siteItem.href}`);

    // إعداد بسيط عند تحميل iframe
    playerFrame.addEventListener('load', () => {
        console.log('تم تحميل iframe بنجاح');
    });

    // إضافة زر إضافة كفيلم بجانب زر إضافة إلى قسم فرعي
    const modalHeaderActions = document.querySelector('.modal-header-actions');

    // إزالة زر إضافة كفيلم السابق إن وجد
    const existingAddAsMovieBtn = document.getElementById('add-as-movie-btn');
    if (existingAddAsMovieBtn) {
        existingAddAsMovieBtn.remove();
    }

    // إنشاء زر إضافة كفيلم
    const addAsMovieBtn = document.createElement('button');
    addAsMovieBtn.id = 'add-as-movie-btn';
    addAsMovieBtn.className = 'btn secondary';
    addAsMovieBtn.title = 'إضافة كفيلم إلى قسم';
    addAsMovieBtn.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة كفيلم';
    addAsMovieBtn.style.cssText = `
        background: linear-gradient(135deg, #9c27b0, #7b1fa2);
        color: white;
        border: none;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(156, 39, 176, 0.2);
        margin-left: 8px;
    `;

    // إضافة تأثيرات hover
    addAsMovieBtn.addEventListener('mouseenter', () => {
        addAsMovieBtn.style.background = 'linear-gradient(135deg, #7b1fa2, #4a148c)';
        addAsMovieBtn.style.transform = 'translateY(-2px)';
        addAsMovieBtn.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
    });

    addAsMovieBtn.addEventListener('mouseleave', () => {
        addAsMovieBtn.style.background = 'linear-gradient(135deg, #9c27b0, #7b1fa2)';
        addAsMovieBtn.style.transform = 'translateY(0)';
        addAsMovieBtn.style.boxShadow = '0 2px 8px rgba(156, 39, 176, 0.2)';
    });

    // إضافة وظيفة الزر
    addAsMovieBtn.onclick = (e) => {
        e.stopPropagation();
        openAddAsMovieModal(siteItem);
    };

    // إدراج الزر قبل زر إضافة إلى قسم فرعي
    modalHeaderActions.insertBefore(addAsMovieBtn, addToSubcategoryBtn);

    // إضافة زر تحديث العنوان يدوياً
    const refreshTitleBtn = document.createElement('button');
    refreshTitleBtn.className = 'btn secondary';
    refreshTitleBtn.title = 'تحديث العنوان يدوياً';
    refreshTitleBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshTitleBtn.style.cssText = `
        background: linear-gradient(135deg, #607d8b, #455a64);
        color: white;
        border: none;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(96, 125, 139, 0.2);
        margin-left: 8px;
        padding: 8px 12px;
    `;

    refreshTitleBtn.onclick = (e) => {
        e.stopPropagation();
        // طلب من المستخدم إدخال العنوان الجديد يدوياً
        const newTitle = prompt('أدخل العنوان الجديد للصفحة:', window.currentIframeTitle || siteItem.name);
        if (newTitle && newTitle.trim() !== '') {
            document.title = `${newTitle.trim()} - New Koktil-aflam v25`;
            window.currentIframeTitle = newTitle.trim();
            showToast(`تم تحديث العنوان إلى: ${newTitle.trim()}`, 'success');
        }
    };

    modalHeaderActions.insertBefore(refreshTitleBtn, addAsMovieBtn);

    // إعداد زر إضافة إلى قسم فرعي (للمواقع المحفوظة كأفلام)
    addToSubcategoryBtn.onclick = (e) => {
        e.stopPropagation();
        // فتح مودال تعديل البيانات أولاً قبل إضافة إلى قسم فرعي
        openEditBeforeSubcategoryModal(siteItem);
    };

    // عرض المودال فوق كل شيء
    modal.classList.add('show');

    // منع التمرير في الخلفية
    document.body.style.overflow = 'hidden';

    // التأكد من أن المودال في المقدمة
    modal.style.zIndex = '9999';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';

    // عرض رسالة توضيحية للمستخدم
    setTimeout(() => {
        showToast('💡 نصيحة: إذا لم يتحدث العنوان تلقائياً عند التنقل، استخدم زر التحديث 🔄', 'info', 5000);
    }, 2000);

    // وظيفة الإغلاق
    const closeModal = () => {
        modal.classList.remove('show');
        playerFrame.src = '';

        // استعادة التمرير في الخلفية
        document.body.style.overflow = '';
        // إزالة الأزرار المضافة
        const addAsMovieBtn = document.getElementById('add-as-movie-btn');
        if (addAsMovieBtn) {
            addAsMovieBtn.remove();
        }
        const refreshTitleBtn = modalHeaderActions.querySelector('.btn.secondary[title="تحديث العنوان يدوياً"]');
        if (refreshTitleBtn) {
            refreshTitleBtn.remove();
        }
        // استعادة العنوان الأصلي
        document.title = originalTitle;
    };

    // زر الإغلاق
    modal.querySelector('.close').onclick = closeModal;

    // إغلاق المودال عند النقر خارجه
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    // إعداد تتبع العنوان البسيط (بدون CORS)
    setupSimplePageTracking(playerFrame, siteItem, originalTitle);
}

// مودال إضافة الموقع كفيلم
function openAddAsMovieModal(siteItem) {
    // الحصول على URL والعنوان الحاليين
    const currentUrl = window.currentIframeUrl || siteItem.href;
    const currentTitle = window.currentIframeTitle || siteItem.name;

    // استخدام النص المظلل من الموقع إذا كان متوفراً، وإلا استخدام العنوان الحالي
    const movieName = window.selectedTextFromSite || currentTitle;

    // صورة افتراضية
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+CjxwYXRoIGQ9Ik04MCA5MEwxMjAgMTIwTDgwIDE1MFoiIGZpbGw9IiM2NjYiLz4KPHRleHQgeD0iMTAwIiB5PSIyMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiPtmB2YrZhNmFPC90ZXh0Pgo8L3N2Zz4K';

    console.log(`فتح مودال إضافة فيلم - URL: ${currentUrl}, العنوان: ${currentTitle}, النص المظلل: ${window.selectedTextFromSite}`);

    // إنشاء المودال
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.zIndex = '10001'; // أعلى من مودال التشغيل

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '500px';

    modalContent.innerHTML = `
        <div class="modal-header">
            <h3><i class="fas fa-plus-circle" style="color: #9c27b0; margin-left: 8px;"></i>إضافة كفيلم</h3>
            <span class="close">&times;</span>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="movie-name-input">اسم الفيلم:</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="movie-name-input" value="${movieName.replace(/"/g, '&quot;')}" class="form-control" style="flex: 1;">
                    ${window.selectedTextFromSite ? '<button type="button" id="clear-selected-text-btn" class="btn" style="background: #f44336; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;" title="مسح النص المحفوظ"><i class="fas fa-times"></i></button>' : ''}
                </div>
                ${window.selectedTextFromSite ? '<small style="color: #9c27b0; font-size: 12px;"><i class="fas fa-info-circle"></i> تم استخدام النص المظلل من الموقع</small>' : ''}
            </div>
            <div class="form-group">
                <label for="movie-url-input">رابط الفيلم:</label>
                <input type="text" id="movie-url-input" value="${currentUrl.replace(/"/g, '&quot;')}" class="form-control">
                <small style="color: #666; font-size: 12px;"><i class="fas fa-link"></i> رابط الصفحة الحالية</small>
            </div>
            <div class="form-group">
                <label for="movie-image-input">رابط الصورة:</label>
                <input type="text" id="movie-image-input" value="${defaultImage}" class="form-control" placeholder="https://example.com/image.jpg">
                <small style="color: #666; font-size: 12px;"><i class="fas fa-image"></i> صورة افتراضية - يمكنك تغييرها لاحقاً</small>
            </div>
            <div class="form-group">
                <label for="movie-category-select">القسم:</label>
                <select id="movie-category-select" class="form-control">
                    <option value="all">جميع الأفلام والمسلسلات</option>
                </select>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="movie-is-series-checkbox"> مسلسل
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button id="save-as-movie-btn" class="btn primary">
                <i class="fas fa-save"></i> حفظ كفيلم
            </button>
            <button id="cancel-add-movie-btn" class="btn secondary">إلغاء</button>
        </div>
    `;

    // ملء قائمة الأقسام
    const categorySelect = modalContent.querySelector('#movie-category-select');

    // إضافة الأقسام الرئيسية
    appState.categories.main.forEach(category => {
        if (category.id !== 'movie-sites' && category.id !== 'all') {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        }
    });

    // إضافة الأقسام الخاصة
    appState.categories.special.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name + ' (خاص)';
        categorySelect.appendChild(option);
    });

    modal.appendChild(modalContent);

    // إضافة مستمعي الأحداث
    const closeBtn = modalContent.querySelector('.close');
    const cancelBtn = modalContent.querySelector('#cancel-add-movie-btn');
    const saveBtn = modalContent.querySelector('#save-as-movie-btn');
    const movieNameInput = modalContent.querySelector('#movie-name-input');

    // إعداد التظليل التلقائي لجميع خانات الإدخال
    setupAutoSelectInputs(modalContent);

    // تظليل اسم الفيلم تمهيداً لتغييره
    setTimeout(() => {
        movieNameInput.focus();
        movieNameInput.select(); // تظليل النص بالكامل
    }, 100);

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    saveBtn.onclick = () => {
        const name = modalContent.querySelector('#movie-name-input').value.trim();
        const url = modalContent.querySelector('#movie-url-input').value.trim();
        const image = modalContent.querySelector('#movie-image-input').value.trim();
        const category = modalContent.querySelector('#movie-category-select').value;
        const isSeries = modalContent.querySelector('#movie-is-series-checkbox').checked;

        if (!name || !url) {
            showToast('يرجى ملء الحقول المطلوبة', 'warning');
            return;
        }

        // إنشاء الفيلم/المسلسل الجديد
        const newItem = {
            id: generateUniqueId(),
            name: name,
            href: url,
            img: image || '',
            category: category,
            subCategories: [],
            hidden: false
        };

        // إضافة إلى القائمة المناسبة
        if (isSeries) {
            appState.series.push(newItem);
        } else {
            appState.movies.push(newItem);
        }

        // حفظ البيانات وتحديث الواجهة
        saveAppData();
        updateCategoriesCounts();
        renderCategories();

        // تحديث العرض الحالي إذا كان في نفس القسم
        if (appState.currentCategory === category || appState.currentCategory === 'all') {
            displayMovies(appState.currentCategory, appState.currentPage);
        }

        showToast(`تم إضافة ${isSeries ? 'المسلسل' : 'الفيلم'} "${name}" بنجاح`, 'success');

        // مسح النص المحفوظ بعد الاستخدام
        window.selectedTextFromSite = '';

        closeModal();
    };

    // إغلاق عند النقر خارج المودال
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    document.body.appendChild(modal);

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        createModalScrollbar(modalContent);
        console.log('✅ تم إضافة شريط التمرير لنافذة إضافة الموقع كفيلم');
    }, 100);
}

// مودال تعديل البيانات قبل إضافة إلى قسم فرعي
function openEditBeforeSubcategoryModal(siteItem) {
    // الحصول على URL والعنوان الحاليين
    const currentUrl = window.currentIframeUrl || siteItem.href;
    const currentTitle = window.currentIframeTitle || siteItem.name;

    // استخدام النص المظلل من الموقع إذا كان متوفراً، وإلا استخدام العنوان الحالي
    const movieName = window.selectedTextFromSite || currentTitle;

    // صورة افتراضية
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+CjxwYXRoIGQ9Ik04MCA5MEwxMjAgMTIwTDgwIDE1MFoiIGZpbGw9IiM2NjYiLz4KPHRleHQgeD0iMTAwIiB5PSIyMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiPtmB2YrZhNmFPC90ZXh0Pgo8L3N2Zz4K';

    console.log(`فتح مودال تعديل البيانات قبل إضافة إلى قسم - URL: ${currentUrl}, العنوان: ${currentTitle}, النص المظلل: ${window.selectedTextFromSite}`);

    // إنشاء المودال
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.zIndex = '10001'; // أعلى من مودال التشغيل

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '500px';

    modalContent.innerHTML = `
        <div class="modal-header">
            <h3><i class="fas fa-edit" style="color: #2196f3; margin-left: 8px;"></i>تعديل البيانات قبل إضافة إلى قسم</h3>
            <span class="close">&times;</span>
        </div>
        <div style="background: #e3f2fd; padding: 12px; margin-bottom: 16px; border-radius: 4px; border-left: 4px solid #2196f3;">
            <small style="color: #1976d2; font-size: 13px;">
                <i class="fas fa-info-circle"></i>
                يمكنك تعديل البيانات هنا وفقاً للصفحة الحالية، ثم اختيار إما إضافة إلى قسم فرعي أو حفظ كفيلم منفصل
            </small>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="edit-movie-name-input">اسم الفيلم:</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="edit-movie-name-input" value="${movieName.replace(/"/g, '&quot;')}" class="form-control" style="flex: 1;">
                    ${window.selectedTextFromSite ? '<button type="button" id="clear-selected-text-edit-btn" class="btn" style="background: #f44336; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;" title="مسح النص المحفوظ"><i class="fas fa-times"></i></button>' : ''}
                </div>
                ${window.selectedTextFromSite ? '<small style="color: #2196f3; font-size: 12px;"><i class="fas fa-info-circle"></i> تم استخدام النص المظلل من الموقع</small>' : ''}
            </div>
            <div class="form-group">
                <label for="edit-movie-url-input">رابط الفيلم:</label>
                <input type="text" id="edit-movie-url-input" value="${currentUrl.replace(/"/g, '&quot;')}" class="form-control">
                <small style="color: #666; font-size: 12px;"><i class="fas fa-link"></i> رابط الصفحة الحالية</small>
            </div>
            <div class="form-group">
                <label for="edit-movie-image-input">رابط الصورة:</label>
                <input type="text" id="edit-movie-image-input" value="${siteItem.img || defaultImage}" class="form-control" placeholder="https://example.com/image.jpg">
                <small style="color: #666; font-size: 12px;"><i class="fas fa-image"></i> ${siteItem.img ? 'صورة الموقع الحالية' : 'صورة افتراضية - يمكنك تغييرها'}</small>
            </div>
        </div>
        <div class="modal-footer">
            <button id="continue-to-subcategory-btn" class="btn primary">
                <i class="fas fa-arrow-right"></i> متابعة إلى اختيار القسم
            </button>
            <button id="save-as-movie-from-edit-btn" class="btn" style="background: #9c27b0; color: white;">
                <i class="fas fa-save"></i> حفظ كفيلم منفصل
            </button>
            <button id="cancel-edit-subcategory-btn" class="btn secondary">إلغاء</button>
        </div>
    `;

    modal.appendChild(modalContent);

    // إضافة مستمعي الأحداث
    const closeBtn = modalContent.querySelector('.close');
    const cancelBtn = modalContent.querySelector('#cancel-edit-subcategory-btn');
    const continueBtn = modalContent.querySelector('#continue-to-subcategory-btn');
    const saveAsMovieBtn = modalContent.querySelector('#save-as-movie-from-edit-btn');
    const movieNameInput = modalContent.querySelector('#edit-movie-name-input');
    const clearTextBtn = modalContent.querySelector('#clear-selected-text-edit-btn');

    // إعداد التظليل التلقائي لجميع خانات الإدخال
    setupAutoSelectInputs(modalContent);

    // تظليل اسم الفيلم تمهيداً لتغييره
    setTimeout(() => {
        movieNameInput.focus();
        movieNameInput.select(); // تظليل النص بالكامل
    }, 100);

    // وظيفة مسح النص المحفوظ
    if (clearTextBtn) {
        clearTextBtn.onclick = () => {
            window.selectedTextFromSite = '';
            movieNameInput.value = currentTitle;
            clearTextBtn.remove();
            modalContent.querySelector('small').remove();
            showToast('تم مسح النص المحفوظ', 'info');
        };
    }

    const closeModal = () => {
        document.body.removeChild(modal);
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    // وظيفة حفظ كفيلم منفصل
    saveAsMovieBtn.onclick = () => {
        const name = modalContent.querySelector('#edit-movie-name-input').value.trim();
        const url = modalContent.querySelector('#edit-movie-url-input').value.trim();
        const image = modalContent.querySelector('#edit-movie-image-input').value.trim();

        if (!name || !url) {
            showToast('يرجى ملء الحقول المطلوبة', 'warning');
            return;
        }

        // إغلاق المودال الحالي وفتح مودال إضافة كفيلم مع البيانات المحدثة
        closeModal();

        // تحديث البيانات المؤقتة
        const updatedSiteItem = {
            ...siteItem,
            name: name,
            href: url,
            img: image
        };

        // تحديث المتغيرات العامة
        window.currentIframeUrl = url;
        window.currentIframeTitle = name;

        openAddAsMovieModal(updatedSiteItem);
    };

    continueBtn.onclick = () => {
        const name = modalContent.querySelector('#edit-movie-name-input').value.trim();
        const url = modalContent.querySelector('#edit-movie-url-input').value.trim();
        const image = modalContent.querySelector('#edit-movie-image-input').value.trim();

        if (!name || !url) {
            showToast('يرجى ملء الحقول المطلوبة', 'warning');
            return;
        }

        // إنشاء كائن فيلم مؤقت بالبيانات المحدثة
        const tempMovie = {
            id: siteItem.id,
            name: name,
            href: url,
            img: image || '',
            category: 'all', // سيتم تحديد القسم عند الإضافة
            subCategories: []
        };

        // مسح النص المحفوظ بعد الاستخدام
        window.selectedTextFromSite = '';

        // إغلاق المودال الحالي وفتح مودال اختيار القسم الفرعي
        closeModal();
        openAddToSubcategoryModal(tempMovie);
    };

    // إغلاق عند النقر خارج المودال
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    document.body.appendChild(modal);

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        createModalScrollbar(modalContent);
        console.log('✅ تم إضافة شريط التمرير لنافذة تعديل قبل إضافة لقسم فرعي');
    }, 100);
}

// إضافة مستمعي الأحداث لبطاقات الأفلام
function addMovieCardEventListeners() {
    // زر التشغيل
    document.querySelectorAll('.movie-play-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = button.dataset.id;
            const movieHref = button.dataset.href;
            const item = findMovieById(movieId);

            if (item) {
                openPlayModal(item);
            }
        });
    });

    // زر التمييز (الإضافة إلى قسم فرعي)
    document.querySelectorAll('.movie-favorite-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = button.dataset.id;
            const item = findMovieById(movieId);

            if (item) {
                openAddToSubcategoryModal(item);
                button.classList.add('marked');
            }
        });
    });

    // زر الحذف من القسم الفرعي
    document.querySelectorAll('.movie-remove-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = button.dataset.id;
            const subcategoryId = button.dataset.subcategory;
            const item = findMovieById(movieId);

            if (item && subcategoryId) {
                removeFromSubcategory(item, subcategoryId);
            }
        });
    });

    // زر التعديل
    document.querySelectorAll('.movie-edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = button.dataset.id;
            const item = findMovieById(movieId);

            if (item) {
                openEditModal(item);
            }
        });
    });

    // زر حذف الفيلم
    document.querySelectorAll('.movie-delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieId = button.dataset.id;
            const item = findMovieById(movieId);

            if (item) {
                // عرض مودال التأكيد
                const modal = document.getElementById('confirm-modal');
                const messageElement = document.getElementById('confirm-message');

                messageElement.textContent = `هل أنت متأكد من رغبتك في حذف "${item.name}"؟`;

                // عرض المودال
                modal.classList.add('show');

                // زر نعم
                document.getElementById('confirm-yes').onclick = () => {
                    deleteMovie(movieId);
                    modal.classList.remove('show');
                };

                // زر لا
                document.getElementById('confirm-no').onclick = () => {
                    modal.classList.remove('show');
                };

                // إغلاق المودال عند النقر على X
                modal.querySelector('.close').onclick = () => {
                    modal.classList.remove('show');
                };

                // إغلاق المودال عند النقر خارجه
                modal.onclick = (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('show');
                    }
                };
            }
        });
    });
}

// البحث عن فيلم حسب المعرّف
function findMovieById(id) {
    let item = appState.movies.find(movie => movie.id === id);
    if (!item) {
        item = appState.series.find(series => series.id === id);
    }
    if (!item && id && id.startsWith('site-')) {
        const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
        if (movieSitesCat && Array.isArray(movieSitesCat.shortcuts)) {
            const idx = parseInt(id.replace('site-', ''));
            const shortcut = movieSitesCat.shortcuts[idx];
            if (shortcut) {
                return {
                    ...shortcut,
                    id: id,
                    category: 'movie-sites',
                    isSiteShortcut: true,
                    _shortcutIndex: idx
                };
            }
        }
    }
    return item;
}

// فتح مودال تشغيل الفيلم
function openPlayModal(item) {
    if (appState.openMoviesExternally) {
        // فتح الفيلم في متصفح خارجي
        window.open(item.href, '_blank');
        // تحديث عنوان الصفحة مؤقتاً لإظهار أن الفيلم تم فتحه
        const originalTitle = document.title;
        document.title = `فتح خارجي: ${item.name} - New Koktil-aflam v25`;
        // استعادة العنوان الأصلي بعد 3 ثوانٍ
        setTimeout(() => {
            document.title = originalTitle;
        }, 3000);
        return;
    }

    const modal = document.getElementById('play-movie-modal');
    const titleElement = document.getElementById('play-movie-title');
    const playerFrame = document.getElementById('movie-player');
    const addToSubcategoryBtn = document.getElementById('add-to-subcategory-from-player');

    titleElement.textContent = item.name;

    // تحديث عنوان الصفحة
    const originalTitle = document.title;
    document.title = `تشغيل: ${item.name} - New Koktil-aflam v25`;

    // تجهيز iframe لتشغيل الفيديو
    if (item.href) {
        if (item.href.includes('youtube.com') || item.href.includes('youtu.be')) {
            // تحويل روابط اليوتيوب العادية إلى روابط embed
            let youtubeId = '';
            if (item.href.includes('youtu.be/')) {
                youtubeId = item.href.split('youtu.be/')[1];
            } else if (item.href.includes('watch?v=')) {
                youtubeId = item.href.split('watch?v=')[1].split('&')[0];
            }

            if (youtubeId) {
                playerFrame.src = `https://www.youtube.com/embed/${youtubeId}`;
            } else {
                playerFrame.src = item.href;
            }
        } else {
            playerFrame.src = item.href;
        }
    } else {
        playerFrame.src = '';
    }

    // إعداد زر إضافة إلى قسم فرعي
    addToSubcategoryBtn.onclick = (e) => {
        e.stopPropagation();
        openAddToSubcategoryModal(item);
    };

    // عرض المودال
    modal.classList.add('show');

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            createModalScrollbar(modalContent);
            console.log('✅ تم إضافة شريط التمرير لنافذة تشغيل الفيلم');
        }
    }, 100);

    // وظيفة الإغلاق
    const closeModal = () => {
        modal.classList.remove('show');
        playerFrame.src = '';
        // استعادة العنوان الأصلي
        document.title = originalTitle;
    };

    // زر الإغلاق
    modal.querySelector('.close').onclick = closeModal;

    // إغلاق المودال عند النقر خارجه
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    // إعداد تتبع العنوان البسيط (بدون CORS)
    setupSimplePageTracking(playerFrame, item, originalTitle);
}







// إضافة تظليل تلقائي لجميع خانات الإدخال في المودالات
function setupAutoSelectInputs(modalElement) {
    const inputs = modalElement.querySelectorAll('input[type="text"], input[type="url"], textarea');

    inputs.forEach(input => {
        // تظليل عند التركيز (بما في ذلك التنقل بـ Tab)
        input.addEventListener('focus', function() {
            // تأخير بسيط للتأكد من اكتمال التركيز
            setTimeout(() => {
                this.select();
            }, 50);
        });

        // تظليل عند النقر
        input.addEventListener('click', function() {
            if (this === document.activeElement) {
                setTimeout(() => {
                    this.select();
                }, 50);
            }
        });

        // تظليل عند الدخول بالماوس إذا كان مركزاً عليه
        input.addEventListener('mouseenter', function() {
            if (this === document.activeElement) {
                this.select();
            }
        });

        // تظليل عند الضغط على مفاتيح التنقل
        input.addEventListener('keydown', function(e) {
            // إذا كان Tab أو Shift+Tab، تظليل الخانة الجديدة بعد التنقل
            if (e.key === 'Tab') {
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (activeElement && (activeElement.type === 'text' || activeElement.type === 'url' || activeElement.tagName === 'TEXTAREA')) {
                        activeElement.select();
                    }
                }, 100);
            }
        });

        // منع إلغاء التظليل عند النقر مرة أخرى على نفس الخانة
        input.addEventListener('mousedown', function(e) {
            if (this === document.activeElement) {
                e.preventDefault();
                this.select();
            }
        });
    });
}

// دالة بسيطة لتجنب مشاكل CORS (تم استبدالها بـ setupSimplePageTracking)
function setupPageTitleTracking(iframe, item, originalTitle) {
    // استدعاء الدالة البسيطة بدلاً من الكود المعقد
    setupSimplePageTracking(iframe, item, originalTitle);
}

// وظيفة مساعدة لاستخراج عنوان أفضل من URL
function extractTitleFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        const pathname = urlObj.pathname;
        const searchParams = urlObj.searchParams;

        // محاولة استخراج عنوان من معاملات URL
        const titleParams = ['title', 'q', 'search', 'query', 'name'];
        for (const param of titleParams) {
            const value = searchParams.get(param);
            if (value && value.length > 0 && value.length < 100) {
                return decodeURIComponent(value).replace(/[+_-]/g, ' ').trim();
            }
        }

        // استخراج من المسار
        if (pathname && pathname !== '/' && pathname !== '') {
            const pathParts = pathname.split('/').filter(part => part && part.length > 0);
            if (pathParts.length > 0) {
                const lastPart = pathParts[pathParts.length - 1];
                const cleanPart = lastPart
                    .replace(/\.(html|php|asp|jsp|htm)$/i, '')
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
                    .trim();

                if (cleanPart.length > 0 && cleanPart.length < 50) {
                    return `${cleanPart} - ${hostname}`;
                }
            }
        }

        // إرجاع اسم الموقع فقط
        return hostname;
    } catch (e) {
        return 'صفحة جديدة';
    }
}

// فتح مودال إضافة إلى قسم فرعي
function openAddToSubcategoryModal(item) {
    const modal = document.getElementById('add-to-subcategory-modal');
    const nameElement = document.getElementById('subcategory-movie-name');
    const idElement = document.getElementById('subcategory-movie-id');

    nameElement.textContent = item.name;
    idElement.value = item.id;

    // تحديث خيارات الأقسام الفرعية بناءً على القسم الحالي
    updateSubcategoryOptions(item);

    // عرض المودال
    modal.classList.add('show');

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            createModalScrollbar(modalContent);
            console.log('✅ تم إضافة شريط التمرير لنافذة إضافة إلى قسم فرعي');
        }
    }, 100);

    // إضافة مستمع أحداث لأزرار الاختيار
    document.querySelectorAll('.subcategory-option').forEach(button => {
        button.addEventListener('click', function() {
            const subcategoryId = this.dataset.category;
            addToSubcategory(item, subcategoryId);
            modal.classList.remove('show');
        });
    });

    // زر إلغاء
    document.getElementById('cancel-subcategory-btn').onclick = () => {
        modal.classList.remove('show');
    };

    // إغلاق المودال عند النقر على X
    modal.querySelector('.close').onclick = () => {
        modal.classList.remove('show');
    };

    // إغلاق المودال عند النقر خارجه
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    };
}

// تحديث خيارات الأقسام الفرعية بناءً على القسم الحالي
function updateSubcategoryOptions(item) {
    const optionsContainer = document.getElementById('subcategory-options-container');
    if (!optionsContainer) return;

    // تفريغ الحاوية
    optionsContainer.innerHTML = '';

    // تحديد القسم الحالي
    const currentCategory = item.category;
    const isSpecialCategory = appState.categories.special.some(cat => cat.id === currentCategory);
    const isRCategory = currentCategory === 'r1' || currentCategory === 'r2';
    const isSCategory = currentCategory === 's1' || currentCategory === 's2' || currentCategory === 's3' || currentCategory === 's-sites';

    // إنشاء الخيارات المناسبة
    let options = [];

    // إضافة الأقسام الفرعية العادية
    options.push({ id: 'selected1', name: 'أفلام مختارة 1' });
    options.push({ id: 'selected2', name: 'أفلام مختارة 2' });
    options.push({ id: 'favorite1', name: 'مفضلة أفلام 1' });
    options.push({ id: 'favorite2', name: 'مفضلة أفلام 2' });

    // إضافة الأقسام الفرعية الخاصة إذا كان قسمًا خاصًا أو R أو S
    if (isRCategory || isSCategory) {
        options.push({ id: 'selected-rs1', name: 'أفلام مختارة R+S1' });
        options.push({ id: 'selected-rs2', name: 'أفلام مختارة R+S2' });
    }

    // إنشاء الأزرار
    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.name;
        button.className = 'subcategory-option';
        button.dataset.category = option.id;

        // التحقق مما إذا كان الفيلم مضافًا بالفعل إلى هذا القسم الفرعي
        if (item.subCategories && item.subCategories.includes(option.id)) {
            button.classList.add('active');
        }

        optionsContainer.appendChild(button);
    });
}

// إضافة عنصر إلى قسم فرعي
function addToSubcategory(item, subcategoryId) {
    // التحقق مما إذا كان العنصر مؤقت (لم يتم حفظه بعد)
    const isTemporaryItem = !findMovieById(item.id);

    if (isTemporaryItem) {
        // إذا كان العنصر مؤقت، نحتاج لحفظه أولاً
        const newItem = {
            id: generateUniqueId(),
            name: item.name,
            href: item.href,
            img: item.img || '',
            category: 'all', // القسم الافتراضي
            subCategories: [subcategoryId], // إضافة القسم الفرعي مباشرة
            dateAdded: new Date().toISOString()
        };

        // تحديد نوع العنصر (فيلم أم مسلسل)
        const isSeries = item.name.toLowerCase().includes('مسلسل') ||
                        item.name.toLowerCase().includes('series') ||
                        item.name.toLowerCase().includes('season');

        // إضافة إلى القائمة المناسبة
        if (isSeries) {
            appState.series.push(newItem);
        } else {
            appState.movies.push(newItem);
        }

        // حفظ البيانات وتحديث الواجهة
        saveAppData();
        updateCategoriesCounts();
        renderCategories();

        // عرض الفيلم في القسم الفرعي المستهدف
        displayMovies(subcategoryId, 1);

        showToast(`تم إضافة "${item.name}" إلى القسم الفرعي "${getSubcategoryName(subcategoryId)}" بنجاح`, 'success');

        // إغلاق مودال تشغيل المواقع إذا كان مفتوحاً
        const playModal = document.getElementById('play-movie-modal');
        if (playModal && playModal.classList.contains('show')) {
            playModal.classList.remove('show');
            document.body.style.overflow = '';
        }

    } else {
        // العنصر موجود بالفعل، نضيف القسم الفرعي فقط
        // التأكد من وجود مصفوفة subCategories
        if (!item.subCategories) {
            item.subCategories = [];
        }

        // التحقق من عدم وجود القسم الفرعي بالفعل
        if (!item.subCategories.includes(subcategoryId)) {
            // إضافة القسم الفرعي
            item.subCategories.push(subcategoryId);

            // حفظ موضع التمرير الحالي
            const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

            // حفظ البيانات وتحديث الواجهة
            saveAppData();
            updateCategoriesCounts();
            renderCategories();
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);

            // استعادة موضع التمرير بعد تحديث الواجهة
            setTimeout(() => {
                window.scrollTo(0, currentScrollPosition);
            }, 50);

            showToast(`تمت إضافة "${item.name}" إلى القسم الفرعي "${getSubcategoryName(subcategoryId)}" بنجاح`, 'success');
        } else {
            showToast(`العنصر موجود بالفعل في هذا القسم الفرعي`, 'info');
        }
    }
}

// الحصول على اسم القسم الفرعي
function getSubcategoryName(subcategoryId) {
    const subcategoryNames = {
        'selected1': 'أفلام مختارة 1',
        'selected2': 'أفلام مختارة 2',
        'favorite1': 'مفضلة أفلام 1',
        'favorite2': 'مفضلة أفلام 2',
        'selected-rs1': 'أفلام مختارة R+S1',
        'selected-rs2': 'أفلام مختارة R+S2'
    };
    return subcategoryNames[subcategoryId] || subcategoryId;
}

// إزالة عنصر من قسم فرعي
function removeFromSubcategory(item, subcategoryId) {
    if (item.subCategories && item.subCategories.includes(subcategoryId)) {
        // عرض مودال التأكيد
        const modal = document.getElementById('confirm-modal');
        const messageElement = document.getElementById('confirm-message');

        messageElement.textContent = `هل أنت متأكد من رغبتك في إزالة "${item.name}" من هذا القسم الفرعي؟`;

        // عرض المودال
        modal.classList.add('show');

        // زر نعم
        document.getElementById('confirm-yes').onclick = () => {
            // إزالة القسم الفرعي
            item.subCategories = item.subCategories.filter(id => id !== subcategoryId);

            // حفظ موضع التمرير الحالي
            const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

            // حفظ البيانات وتحديث الواجهة
            saveAppData();
            updateCategoriesCounts();
            renderCategories();
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);

            // استعادة موضع التمرير بعد تحديث الواجهة
            setTimeout(() => {
                window.scrollTo(0, currentScrollPosition);
            }, 50);

            modal.classList.remove('show');
            showToast(`تمت إزالة العنصر من القسم الفرعي بنجاح`, 'success');
        };

        // زر لا
        document.getElementById('confirm-no').onclick = () => {
            modal.classList.remove('show');
        };

        // إغلاق المودال عند النقر على X
        modal.querySelector('.close').onclick = () => {
            modal.classList.remove('show');
        };

        // إغلاق المودال عند النقر خارجه
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };
    }
}

// حذف فيلم
function deleteMovie(movieId) {
    const item = findMovieById(movieId);

    if (!item) {
        showToast('لم يتم العثور على الفيلم', 'error');
        return;
    }

    // التعامل مع اختصارات المواقع
    if (item.isSiteShortcut && typeof item._shortcutIndex !== 'undefined') {
        const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
        if (movieSitesCat && Array.isArray(movieSitesCat.shortcuts)) {
            movieSitesCat.shortcuts.splice(item._shortcutIndex, 1);
        }
    } else if (item.category === 'series') {
        appState.series = appState.series.filter(series => series.id !== movieId);
    } else {
        appState.movies = appState.movies.filter(movie => movie.id !== movieId);
    }

    // حفظ موضع التمرير الحالي
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // حفظ البيانات وتحديث الواجهة
    saveAppData();
    updateCategoriesCounts();
    renderCategories();
    displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);

    // استعادة موضع التمرير بعد تحديث الواجهة
    setTimeout(() => {
        window.scrollTo(0, currentScrollPosition);
    }, 50);

    showToast(`تم حذف "${item.name}" بنجاح`, 'success');
}

// عرض رسائل التوست
function showToast(message, type = 'info') {
    console.log(`عرض رسالة توست: ${type} - ${message}`);

    // إنشاء عنصر التوست
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // تحويل الأسطر الجديدة إلى <br> لدعم الرسائل متعددة الأسطر
    const formattedMessage = message.replace(/\n/g, '<br>');
    toast.innerHTML = formattedMessage;

    // إضافة أنماط إضافية للتوست
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;

    // إضافة إلى الصفحة
    document.body.appendChild(toast);

    // إظهار التوست
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);

    // إخفاء التوست بعد فترة (أطول للرسائل الطويلة)
    const hideDelay = message.length > 100 ? 5000 : 3000;
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, hideDelay);
}

// حفظ سرعة الاستيراد الافتراضية
function saveDefaultImportSpeed(speed) {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_IMPORT_SPEED, speed);
    showToast(`تم تعيين سرعة الاستيراد الافتراضية إلى ${speed}`, 'success');
}

// إضافة مستمعي الأحداث للتطبيق
function setupEventListeners() {

    // إضافة معالج الأحداث للزر لتحديث البيانات من السحابة
    const refreshCloudBtn = document.getElementById('refresh-from-cloud');
    if (refreshCloudBtn) {
        refreshCloudBtn.addEventListener('click', loadFromJSONBin);
    }

    // إعداد التظليل التلقائي لخانات إضافة الأفلام في الصفحة الرئيسية
    const mainAddMovieSection = document.querySelector('.manual-add-section');
    if (mainAddMovieSection) {
        setupAutoSelectInputs(mainAddMovieSection);
    }

    // زر حذف كل أفلام الأقسام الفرعية
    const deleteSubMoviesBtn = document.getElementById('delete-subcategories-movies-btn');
    if (deleteSubMoviesBtn) {
        deleteSubMoviesBtn.addEventListener('click', function() {
            const type = document.getElementById('subcategory-type-select').value;
            let removedCount = 0;
            if (type === 'sub') {
                // حذف كل الأفلام التي تحتوي على أي subCategories من الأقسام العامة الفرعية
                const subIds = (appState.categories.sub || []).map(cat => cat.id);
                const before = appState.movies.length;
                appState.movies = appState.movies.filter(movie => {
                    if (!movie.subCategories) return true;
                    return !movie.subCategories.some(subId => subIds.includes(subId));
                });
                removedCount = before - appState.movies.length;
            } else if (type === 'specialSub') {
                // حذف كل الأفلام التي تحتوي على أي specialSubCategories من الأقسام الخاصة الفرعية
                const subIds = (appState.categories.specialSub || []).map(cat => cat.id);
                const before = appState.movies.length;
                appState.movies = appState.movies.filter(movie => {
                    if (!movie.specialSubCategories) return true;
                    return !movie.specialSubCategories.some(subId => subIds.includes(subId));
                });
                removedCount = before - appState.movies.length;
            }
            saveAppData();
            updateCategoriesCounts();
            renderCategories();
            document.getElementById('subcategories-export-status').textContent = `تم حذف ${removedCount} فيلم من الأقسام الفرعية.`;
        });
    }

    // --- قسم إدارة الأقسام الفرعية ---
    // تفعيل التبويب عند الضغط
    const subcategoriesTabBtn = document.querySelector('.tab-btn[data-tab="manage-subcategories"]');
    const subcategoriesTab = document.getElementById('manage-subcategories-tab');
    if (subcategoriesTabBtn && subcategoriesTab) {
        subcategoriesTabBtn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            subcategoriesTabBtn.classList.add('active');
            subcategoriesTab.classList.add('active');
        });
    }

    // زر تصدير الأقسام الفرعية
    const exportSubBtn = document.getElementById('export-subcategories-btn');
    if (exportSubBtn) {
        exportSubBtn.addEventListener('click', function() {
            const type = document.getElementById('subcategory-type-select').value;
            let categories = [];
            let categoryKey = '';
            if (type === 'sub') {
                categories = appState.categories.sub || [];
                categoryKey = 'sub';
            } else if (type === 'specialSub') {
                categories = appState.categories.specialSub || [];
                categoryKey = 'specialSub';
            }
            if (!categories.length) {
                document.getElementById('subcategories-export-status').textContent = 'لا توجد بيانات للتصدير.';
                return;
            }
            // جمع الأفلام الموجودة في هذه الأقسام الفرعية مع تحسين البيانات
            let movies = [];
            let series = [];

            if (categoryKey) {
                // جمع الأفلام
                const filteredMovies = (appState.movies || []).filter(movie => {
                    if (categoryKey === 'sub') {
                        return movie.subCategories && movie.subCategories.some(subId => categories.some(cat => cat.id === subId));
                    } else if (categoryKey === 'specialSub') {
                        return movie.specialSubCategories && movie.specialSubCategories.some(subId => categories.some(cat => cat.id === subId));
                    }
                    return false;
                });

                // تحسين بيانات الأفلام للتصدير (إزالة القسم الأصلي والاحتفاظ بالأقسام الفرعية فقط)
                movies = filteredMovies.map(movie => {
                    const exportedMovie = { ...movie };

                    if (categoryKey === 'sub') {
                        // الاحتفاظ بالأقسام الفرعية المُصدرة فقط
                        exportedMovie.subCategories = movie.subCategories ?
                            movie.subCategories.filter(subId => categories.some(cat => cat.id === subId)) : [];
                        // إزالة القسم الأصلي لتجنب التداخل عند الاستيراد
                        exportedMovie.originalCategory = movie.category;
                        delete exportedMovie.category;
                    } else if (categoryKey === 'specialSub') {
                        exportedMovie.specialSubCategories = movie.specialSubCategories ?
                            movie.specialSubCategories.filter(subId => categories.some(cat => cat.id === subId)) : [];
                        exportedMovie.originalCategory = movie.category;
                        delete exportedMovie.category;
                    }

                    return exportedMovie;
                });

                // جمع المسلسلات
                const filteredSeries = (appState.series || []).filter(seriesItem => {
                    if (categoryKey === 'sub') {
                        return seriesItem.subCategories && seriesItem.subCategories.some(subId => categories.some(cat => cat.id === subId));
                    } else if (categoryKey === 'specialSub') {
                        return seriesItem.specialSubCategories && seriesItem.specialSubCategories.some(subId => categories.some(cat => cat.id === subId));
                    }
                    return false;
                });

                series = filteredSeries.map(seriesItem => {
                    const exportedSeries = { ...seriesItem };

                    if (categoryKey === 'sub') {
                        exportedSeries.subCategories = seriesItem.subCategories ?
                            seriesItem.subCategories.filter(subId => categories.some(cat => cat.id === subId)) : [];
                        exportedSeries.originalCategory = seriesItem.category;
                        delete exportedSeries.category;
                    } else if (categoryKey === 'specialSub') {
                        exportedSeries.specialSubCategories = seriesItem.specialSubCategories ?
                            seriesItem.specialSubCategories.filter(subId => categories.some(cat => cat.id === subId)) : [];
                        exportedSeries.originalCategory = seriesItem.category;
                        delete exportedSeries.category;
                    }

                    return exportedSeries;
                });
            }

            const exportObj = {
                categories: categories,
                movies: movies,
                series: series,
                exportType: 'subcategories',
                exportDate: new Date().toISOString(),
                subcategoryType: categoryKey
            };
            const dataStr = JSON.stringify(exportObj, null, 2);
            const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
            // إضافة التاريخ إلى اسم الملف
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const fileName = type === 'sub'
                ? `public_subcategories_${dateStr}.json`
                : `private_subcategories_${dateStr}.json`;
            const link = document.createElement('a');
            link.setAttribute('href', dataUri);
            link.setAttribute('download', fileName);
            link.click();
            document.getElementById('subcategories-export-status').textContent = 'تم تصدير البيانات بنجاح.';
        });
    }

    // زر استيراد الأقسام الفرعية
    const importSubBtn = document.getElementById('import-subcategories-btn');
    const importSubFile = document.getElementById('import-subcategories-file');
    if (importSubBtn && importSubFile) {
        importSubBtn.addEventListener('click', function() {
            importSubFile.value = '';
            importSubFile.click();
        });
        importSubFile.addEventListener('change', function(e) {
            const type = document.getElementById('subcategory-type-select').value;
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const imported = JSON.parse(evt.target.result);
                    // دعم الصيغتين: القديمة (مصفوفة فقط) أو الجديدة (كائن فيه categories و movies و series)
                    let importedCategories = [];
                    let importedMovies = [];
                    let importedSeries = [];
                    let importedCount = 0;
                    let updatedCount = 0;

                    if (Array.isArray(imported)) {
                        importedCategories = imported;
                    } else if (imported && Array.isArray(imported.categories)) {
                        importedCategories = imported.categories;
                        if (Array.isArray(imported.movies)) {
                            importedMovies = imported.movies;
                        }
                        if (Array.isArray(imported.series)) {
                            importedSeries = imported.series;
                        }
                    } else {
                        throw new Error('الملف غير صحيح');
                    }

                    // تحديث أو إضافة الأقسام الفرعية
                    let targetCategories = type === 'sub' ? appState.categories.sub : appState.categories.specialSub;
                    importedCategories.forEach(importedCat => {
                        const idx = targetCategories.findIndex(cat => cat.id === importedCat.id);
                        if (idx !== -1) {
                            // تحديث القسم الموجود
                            targetCategories[idx] = { ...targetCategories[idx], ...importedCat };
                        } else {
                            // إضافة قسم جديد
                            targetCategories.push(importedCat);
                        }
                    });
                    if (type === 'sub') {
                        appState.categories.sub = targetCategories;
                    } else {
                        appState.categories.specialSub = targetCategories;
                    }

                    // تحديث أو إضافة الأفلام للأقسام الفرعية
                    if (importedMovies.length) {
                        importedMovies.forEach(movie => {
                            let foundIdx = appState.movies.findIndex(m => m.id === movie.id);
                            if (foundIdx !== -1) {
                                // تحديث الفيلم الموجود - إضافة الأقسام الفرعية الجديدة
                                const existingMovie = appState.movies[foundIdx];

                                if (type === 'sub' && Array.isArray(movie.subCategories)) {
                                    // دمج الأقسام الفرعية الجديدة مع الموجودة
                                    const existingSubCategories = existingMovie.subCategories || [];
                                    const newSubCategories = movie.subCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId) &&
                                        !existingSubCategories.includes(subId)
                                    );
                                    existingMovie.subCategories = [...existingSubCategories, ...newSubCategories];
                                }

                                if (type === 'specialSub' && Array.isArray(movie.specialSubCategories)) {
                                    const existingSpecialSubCategories = existingMovie.specialSubCategories || [];
                                    const newSpecialSubCategories = movie.specialSubCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId) &&
                                        !existingSpecialSubCategories.includes(subId)
                                    );
                                    existingMovie.specialSubCategories = [...existingSpecialSubCategories, ...newSpecialSubCategories];
                                }

                                updatedCount++;
                            } else {
                                // إضافة فيلم جديد - إضافة للأقسام الفرعية فقط
                                const newMovie = { ...movie };

                                // استعادة القسم الأصلي أو تعيين قسم افتراضي
                                newMovie.category = movie.originalCategory || 'all';
                                delete newMovie.originalCategory;

                                // تنظيف الأقسام الفرعية للاحتفاظ بالمستوردة فقط
                                if (type === 'sub' && Array.isArray(movie.subCategories)) {
                                    newMovie.subCategories = movie.subCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId)
                                    );
                                }

                                if (type === 'specialSub' && Array.isArray(movie.specialSubCategories)) {
                                    newMovie.specialSubCategories = movie.specialSubCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId)
                                    );
                                }

                                appState.movies.push(newMovie);
                                importedCount++;
                            }
                        });
                    }

                    // تحديث أو إضافة المسلسلات للأقسام الفرعية
                    if (importedSeries.length) {
                        importedSeries.forEach(seriesItem => {
                            let foundIdx = appState.series.findIndex(s => s.id === seriesItem.id);
                            if (foundIdx !== -1) {
                                // تحديث المسلسل الموجود
                                const existingSeries = appState.series[foundIdx];

                                if (type === 'sub' && Array.isArray(seriesItem.subCategories)) {
                                    const existingSubCategories = existingSeries.subCategories || [];
                                    const newSubCategories = seriesItem.subCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId) &&
                                        !existingSubCategories.includes(subId)
                                    );
                                    existingSeries.subCategories = [...existingSubCategories, ...newSubCategories];
                                }

                                if (type === 'specialSub' && Array.isArray(seriesItem.specialSubCategories)) {
                                    const existingSpecialSubCategories = existingSeries.specialSubCategories || [];
                                    const newSpecialSubCategories = seriesItem.specialSubCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId) &&
                                        !existingSpecialSubCategories.includes(subId)
                                    );
                                    existingSeries.specialSubCategories = [...existingSpecialSubCategories, ...newSpecialSubCategories];
                                }

                                updatedCount++;
                            } else {
                                // إضافة مسلسل جديد
                                const newSeries = { ...seriesItem };

                                newSeries.category = seriesItem.originalCategory || 's1';
                                delete newSeries.originalCategory;

                                if (type === 'sub' && Array.isArray(seriesItem.subCategories)) {
                                    newSeries.subCategories = seriesItem.subCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId)
                                    );
                                }

                                if (type === 'specialSub' && Array.isArray(seriesItem.specialSubCategories)) {
                                    newSeries.specialSubCategories = seriesItem.specialSubCategories.filter(subId =>
                                        importedCategories.some(cat => cat.id === subId)
                                    );
                                }

                                appState.series.push(newSeries);
                                importedCount++;
                            }
                        });
                    }

                    saveAppData();
                    updateCategoriesCounts();
                    renderCategories();

                    const statusMessage = `تم الاستيراد بنجاح. تم إضافة ${importedCount} عنصر جديد وتحديث ${updatedCount} عنصر موجود للأقسام الفرعية.`;
                    document.getElementById('subcategories-export-status').textContent = statusMessage;

                    // إظهار إشعار نجاح
                    showToast(statusMessage, 'success');
                } catch (err) {
                    console.error('خطأ في الاستيراد:', err);
                    document.getElementById('subcategories-export-status').textContent = 'فشل الاستيراد: ملف غير صالح أو تالف.';
                }
            };
            reader.readAsText(file);
        });
    }
    // تغيير طريقة العرض (شبكي/قائمة)
    const viewModeSelect = document.getElementById('view-mode');
    viewModeSelect.value = appState.viewMode;
    viewModeSelect.addEventListener('change', () => {
        appState.viewMode = viewModeSelect.value;

        // حفظ موضع التمرير الحالي
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);

        // استعادة موضع التمرير بعد تحديث الواجهة
        setTimeout(() => {
            window.scrollTo(0, currentScrollPosition);
        }, 50);

        saveAppData();
    });

    // تغيير طريقة الترتيب
    const sortOptionsSelect = document.getElementById('sort-options');
    sortOptionsSelect.value = appState.sortBy;

    // تحديث حقل الإدخال الرقمي للترتيب ليتطابق مع القيمة الحالية
    const sortInput = document.getElementById('sort-options-input');
    if (sortInput) {
        const sortMappings = { 'name': '1', 'site': '2', 'date': '3', 'date-asc': '4', 'star': '5' };
        if (sortMappings[appState.sortBy]) {
            sortInput.value = sortMappings[appState.sortBy];
        }
    }

    // إظهار/إخفاء خيار الترتيب حسب النجم عندما يكون القسم الحالي هو أفلام النجوم
    const starSortOption = document.querySelector('.star-sort-option');
    if (starSortOption) {
        if (appState.currentCategory === 'stars') {
            starSortOption.classList.remove('hidden');
        } else {
            starSortOption.classList.add('hidden');
        }
    }

    sortOptionsSelect.addEventListener('change', () => {
        const oldSortBy = appState.sortBy;
        appState.sortBy = sortOptionsSelect.value;

        // إعادة تعيين الفلاتر عند تغيير نوع الترتيب
        if (oldSortBy !== appState.sortBy) {
            appState.selectedSite = '';
            appState.selectedStar = '';
        }

        // إظهار/إخفاء خانات الفلترة حسب نوع الترتيب
        updateFilterVisibility();

        // حفظ موضع التمرير الحالي
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);

        // استعادة موضع التمرير بعد تحديث الواجهة
        setTimeout(() => {
            window.scrollTo(0, currentScrollPosition);
        }, 50);

        saveAppData();
    });

    // إضافة مستمعي الأحداث لخانات الفلترة
    const siteFilter = document.getElementById('site-filter');
    const starFilter = document.getElementById('star-filter');

    if (siteFilter) {
        siteFilter.addEventListener('change', () => {
            appState.selectedSite = siteFilter.value;
            appState.currentPage = 1; // إعادة تعيين الصفحة إلى الأولى عند الفلترة
            displayMovies(appState.currentCategory, appState.currentPage); // هنا نريد الانتقال للأعلى عند الفلترة
            saveAppData();
        });
    }

    if (starFilter) {
        starFilter.addEventListener('change', () => {
            appState.selectedStar = starFilter.value;
            appState.currentPage = 1; // إعادة تعيين الصفحة إلى الأولى عند الفلترة
            displayMovies(appState.currentCategory, appState.currentPage); // هنا نريد الانتقال للأعلى عند الفلترة
            saveAppData();
        });
    }

    // زر الإعدادات
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);

    // البحث في التطبيق
    document.getElementById('search-app-btn').addEventListener('click', () => {
        const searchQuery = document.getElementById('search-input').value.trim();
        if (searchQuery.length > 0) {
            searchInApp(searchQuery);
        }
    });

    // البحث عند الضغط على Enter
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchQuery = e.target.value.trim();
            if (searchQuery.length > 0) {
                searchInApp(searchQuery);
            }
        }
    });

    // البحث في جوجل
    document.getElementById('search-google-btn').addEventListener('click', () => {
        const searchQuery = document.getElementById('search-input').value.trim();
        if (searchQuery.length > 0) {
            const fullSearchQuery = `مشاهدة فيلم ${searchQuery}`;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(fullSearchQuery)}`;
            openSearchInApp(searchUrl, `بحث Google: ${searchQuery}`, 'google');
        }
    });

    // البحث في ياندكس
    document.getElementById('search-yandex-btn').addEventListener('click', () => {
        const searchQuery = document.getElementById('search-input').value.trim();
        if (searchQuery.length > 0) {
            const fullSearchQuery = `مشاهدة فيلم ${searchQuery}`;
            const searchUrl = `https://yandex.com/search/?text=${encodeURIComponent(fullSearchQuery)}`;
            openSearchInApp(searchUrl, `بحث Yandex: ${searchQuery}`, 'yandex');
        }
    });

    // إغلاق نتائج البحث
    document.querySelector('.close-search').addEventListener('click', () => {
        document.getElementById('search-results').classList.add('hidden');
        // استعادة عنوان الصفحة المحفوظ
        document.title = appState.currentPageTitle || 'New Koktil-aflam v25';
    });

    // تعليق مستمعي إعدادات السكرول
    setupScrollHandlers();

    // تعليق مستمعي الأحداث للتكبير/التصغير
    setupZoomControls();

    // تعليق مستمعي إعدادات السحب والإفلات
    setupDropZones();

    // تهيئة أيقونات التنقل في الرأس
    setupHeaderNavigation();

    // تهيئة رؤية خانات الفلترة
    setTimeout(() => {
        updateFilterVisibility();

        // تطبيق القيم المحفوظة للفلاتر
        const siteFilter = document.getElementById('site-filter');
        const starFilter = document.getElementById('star-filter');
        if (siteFilter && appState.selectedSite) siteFilter.value = appState.selectedSite;
        if (starFilter && appState.selectedStar) starFilter.value = appState.selectedStar;

        // تحديث حقول الإدخال الرقمية
        if (typeof updateNumberInputsFromSelects === 'function') {
            updateNumberInputsFromSelects();
        }
    }, 100);
}

// تهيئة أيقونات التنقل
function setupHeaderNavigation() {
    const headerNavigation = document.querySelector('.header-navigation');

    // إخفاء أيقونات التنقل في البداية حتى يتم تحميل البيانات
    if (headerNavigation) {
        headerNavigation.style.display = 'none';
    }

    // إضافة دعم لوحة المفاتيح للتنقل
    document.addEventListener('keydown', (event) => {
        // التأكد من أن المستخدم لا يكتب في حقل إدخال
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const totalPages = Math.ceil(getTotalItemsCount() / appState.itemsPerPage);

        // السهم الأيسر أو مفتاح A للصفحة السابقة
        if ((event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') && appState.currentPage > 1) {
            event.preventDefault();
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, appState.currentPage - 1);
        }

        // السهم الأيمن أو مفتاح D للصفحة التالية
        if ((event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') && appState.currentPage < totalPages) {
            event.preventDefault();
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, appState.currentPage + 1);
        }

        // مفتاح Home للصفحة الأولى
        if (event.key === 'Home' && appState.currentPage > 1) {
            event.preventDefault();
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, 1);
        }

        // مفتاح End للصفحة الأخيرة
        if (event.key === 'End' && appState.currentPage < totalPages) {
            event.preventDefault();
            scrollToTopImmediate();
            displayMovies(appState.currentCategory, totalPages);
        }
    });
}

// دالة مساعدة للحصول على العدد الإجمالي للعناصر
function getTotalItemsCount() {
    let items = [];

    if (appState.currentCategory === 'all') {
        items = [...appState.movies, ...appState.series];
    } else {
        const categoryObj = [...appState.categories.main, ...appState.categories.sub,
                             ...appState.categories.special, ...appState.categories.specialSub]
                            .find(cat => cat.id === appState.currentCategory);

        if (categoryObj) {
            items = categoryObj.items || [];
        }
    }

    // تطبيق الفلاتر
    items = applyFilters(items);

    return items.length;
}

// إعداد مستمعي الأحداث للتكبير/التصغير
function setupZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');

    if (zoomInBtn && zoomOutBtn && zoomResetBtn) {
        zoomInBtn.addEventListener('click', () => {
            // حد أقصى تكبير بمقدار الضعف (2.0) بدرجات 5%
            if (appState.zoomLevel < 2.0) {
                appState.zoomLevel += 0.05; // زيادة بمقدار 5%
                // التأكد من عدم تجاوز الحد الأقصى
                if (appState.zoomLevel > 2.0) {
                    appState.zoomLevel = 2.0;
                }
                applyZoom();
                saveAppData(); // حفظ مستوى التكبير
            }
        });

        zoomOutBtn.addEventListener('click', () => {
            // حد أدنى تصغير بمقدار النصف (0.5) بدرجات 5%
            if (appState.zoomLevel > 0.5) {
                appState.zoomLevel -= 0.05; // تقليل بمقدار 5%
                // التأكد من عدم النزول تحت 0.5
                if (appState.zoomLevel < 0.5) {
                    appState.zoomLevel = 0.5;
                }
                applyZoom();
                saveAppData(); // حفظ مستوى التكبير
            }
        });

        zoomResetBtn.addEventListener('click', () => {
            appState.zoomLevel = 1;
            applyZoom();
            saveAppData(); // حفظ مستوى التكبير
        });
    }
}

// تطبيق مستوى التكبير
function applyZoom() {
    // تطبيق التكبير على حجم الخط الأساسي
    document.documentElement.style.fontSize = `${16 * appState.zoomLevel}px`;

    // تطبيق التكبير على الصفحة بأكملها مع توزيع متناسق
    const appContainer = document.querySelector('.app-container');
    const body = document.body;
    const html = document.documentElement;

    if (appState.zoomLevel !== 1) {
        // تطبيق التكبير على الحاوية الرئيسية
        if (appContainer) {
            appContainer.style.transform = `scale(${appState.zoomLevel})`;
            appContainer.style.transformOrigin = 'top center';
            appContainer.style.width = `${100 / appState.zoomLevel}%`;
            appContainer.style.margin = '0 auto';
        }

        // تعديل إعدادات الجسم والـ HTML
        body.style.overflowX = 'auto';
        html.style.overflowX = 'auto';

        // ضمان أن الخلفية تغطي كامل الشاشة
        body.style.minWidth = '100%';
        body.style.backgroundColor = 'var(--main-bg-color)';

        // تعديل موضع أزرار التكبير/التصغير لتبقى في مكانها
        const zoomControls = document.querySelector('.zoom-controls');
        if (zoomControls) {
            zoomControls.style.transform = `scale(${1 / appState.zoomLevel})`;
            zoomControls.style.left = `${20 / appState.zoomLevel}px`;
            zoomControls.style.bottom = `${20 / appState.zoomLevel}px`;
        }
    } else {
        // إعادة تعيين القيم الافتراضية
        if (appContainer) {
            appContainer.style.transform = '';
            appContainer.style.transformOrigin = '';
            appContainer.style.width = '';
            appContainer.style.margin = '';
        }

        body.style.overflowX = '';
        html.style.overflowX = '';
        body.style.minWidth = '';
        body.style.backgroundColor = '';

        // إعادة تعيين أزرار التكبير/التصغير
        const zoomControls = document.querySelector('.zoom-controls');
        if (zoomControls) {
            zoomControls.style.transform = '';
            zoomControls.style.left = '';
            zoomControls.style.bottom = '';
        }
    }

    // تحديث أزرار التكبير/التصغير لإظهار الحالة الحالية
    updateZoomButtonsState();
}

// تحديث حالة أزرار التكبير/التصغير
function updateZoomButtonsState() {
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');

    if (zoomInBtn) {
        zoomInBtn.disabled = appState.zoomLevel >= 2.0;
        zoomInBtn.style.opacity = appState.zoomLevel >= 2.0 ? '0.5' : '1';
    }

    if (zoomOutBtn) {
        zoomOutBtn.disabled = appState.zoomLevel <= 0.5;
        zoomOutBtn.style.opacity = appState.zoomLevel <= 0.5 ? '0.5' : '1';
    }
}

// إعداد مستمعي إعدادات السكرول
function setupScrollHandlers() {
    let lastScrollPosition = 0;
    const header = document.getElementById('app-header');

    window.addEventListener('scroll', () => {
        const currentScrollPosition = window.pageYOffset;

        // إخفاء/إظهار الرأس عند التمرير
        if (currentScrollPosition > lastScrollPosition && currentScrollPosition > 50) {
            // تمرير لأسفل
            header.classList.add('hidden');
        } else if (currentScrollPosition < lastScrollPosition || currentScrollPosition < 50) {
            // تمرير لأعلى
            header.classList.remove('hidden');
        }

        lastScrollPosition = currentScrollPosition;
    });
}

// إعداد مستمعي إعدادات السحب والإفلات
function setupDropZones() {
    console.log('إعداد مناطق السحب والإفلات...');

    const dropZones = [
        document.getElementById('s3-dropzone'),
        document.getElementById('s-sites-dropzone'),
        document.getElementById('import-dropzone'),
        document.getElementById('movies-import-dropzone')
    ];

    // إضافة مستمعي الأحداث لجميع مناطق السحب والإفلات
    dropZones.forEach(zone => {
        if (zone) {
            console.log(`إعداد منطقة السحب والإفلات: ${zone.id}`);

            // منع السلوك الافتراضي للسحب والإفلات
            zone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add('dragover');
                console.log(`دخول السحب في: ${zone.id}`);
            });

            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.add('dragover');
            });

            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // التحقق من أن المؤشر خرج من المنطقة فعلاً
                if (!zone.contains(e.relatedTarget)) {
                    zone.classList.remove('dragover');
                    console.log(`خروج السحب من: ${zone.id}`);
                }
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.classList.remove('dragover');
                console.log(`إفلات في: ${zone.id}`);

                // إظهار رسالة فورية للسحب والإفلات
                if (zone.id === 's3-dropzone') {
                    console.log('معالجة الإفلات في قسم S3');
                    showToast('📥 تم استلام البيانات في قسم الاكس S3', 'info');
                    setTimeout(() => {
                        handleDropToS3Zone(e.dataTransfer);
                    }, 100);
                } else if (zone.id === 's-sites-dropzone') {
                    console.log('معالجة الإفلات في قسم S SITES');
                    showToast('📥 تم استلام البيانات في قسم S SITES', 'info');
                    setTimeout(() => {
                        handleDropToSitesZone(e.dataTransfer);
                    }, 100);
                } else if (zone.id === 'import-dropzone') {
                    handleImportDrop(e.dataTransfer);
                } else if (zone.id === 'movies-import-dropzone') {
                    handleMoviesImportDrop(e.dataTransfer);
                }
            });
        } else {
            console.warn(`منطقة السحب والإفلات غير موجودة`);
        }
    });

    // إعداد أزرار الإضافة
    const s3AddBtn = document.getElementById('s3-add-btn');
    const sSitesAddBtn = document.getElementById('s-sites-add-btn');

    if (s3AddBtn) {
        console.log('إعداد زر إضافة S3');
        s3AddBtn.addEventListener('click', () => {
            const linksInput = document.getElementById('s3-links-input');
            if (linksInput && linksInput.value.trim()) {
                console.log('إضافة روابط S3:', linksInput.value.trim());
                handleS3Links(linksInput.value.trim());
                linksInput.value = '';
            } else {
                showToast('يرجى إدخال روابط صحيحة', 'warning');
            }
        });
    } else {
        console.warn('زر إضافة S3 غير موجود');
    }

    if (sSitesAddBtn) {
        console.log('إعداد زر إضافة S SITES');
        sSitesAddBtn.addEventListener('click', () => {
            const linksInput = document.getElementById('s-sites-links-input');
            if (linksInput && linksInput.value.trim()) {
                console.log('إضافة روابط S SITES:', linksInput.value.trim());
                handleSitesLinks(linksInput.value.trim());
                linksInput.value = '';
            } else {
                showToast('يرجى إدخال روابط صحيحة', 'warning');
            }
        });
    } else {
        console.warn('زر إضافة S SITES غير موجود');
    }

    // إضافة دعم للصق الروابط مباشرة في حقول النص
    const s3Input = document.getElementById('s3-links-input');
    const sSitesInput = document.getElementById('s-sites-links-input');

    if (s3Input) {
        s3Input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (s3Input.value.trim()) {
                    handleS3Links(s3Input.value.trim());
                    s3Input.value = '';
                }
            }
        });
    }

    if (sSitesInput) {
        sSitesInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (sSitesInput.value.trim()) {
                    handleSitesLinks(sSitesInput.value.trim());
                    sSitesInput.value = '';
                }
            }
        });
    }
}

// معالجة السحب والإفلات لاستيراد الأفلام
function handleMoviesImportDrop(dataTransfer) {
    const files = dataTransfer.files;
    if (files && files.length > 0) {
        handleMoviesImportFiles(files);
    }
}

// معالجة ملفات استيراد الأفلام
function handleMoviesImportFiles(files) {
    // منع الاستدعاءات المتكررة
    if (handleMoviesImportFiles._isRunning) {
        showToast('جاري استيراد ملفات أخرى، يرجى الانتظار', 'warning');
        return;
    }
    handleMoviesImportFiles._isRunning = true;

    const importCategory = document.getElementById('import-category').value;
    if (!importCategory) {
        showToast('يرجى اختيار قسم للاستيراد إليه', 'warning');
        handleMoviesImportFiles._isRunning = false;
        return;
    }

    // الحصول على اسم النجم المدخل إذا كان القسم هو أفلام النجوم
    const defaultStarName = importCategory === 'stars' ?
        document.getElementById('import-star-name').value.trim() : '';

    // قراءة كل ملف كـ JSON
    let filesProcessed = 0;
    let totalImportedItems = 0;
    let totalItemsCount = 0;
    let duplicatesCount = 0;

    // إنشاء وإظهار مؤشر التقدم
    createProgressIndicator('movies-import-progress');

    // استخدام setTimeout لتجنب تهنيج الصفحة
    const processFile = (index) => {
        if (index >= files.length) {
            // انتهت معالجة جميع الملفات
            saveAppData();
            updateCategoriesCounts();
            renderCategories();

            if (appState.currentCategory === importCategory) {
                displayMovies(importCategory);
            }

            // إزالة مؤشر التقدم بعد انتهاء الاستيراد
            setTimeout(() => {
                // تأكد من أن مؤشر التقدم لا يزال موجودًا قبل إزالته
                if (document.getElementById('movies-import-progress')) {
                    removeProgressIndicator('movies-import-progress');
                    let message = `تم استيراد ${totalImportedItems} فيلم من ${filesProcessed} ملف بنجاح`;
                    if (duplicatesCount > 0) {
                        message += ` (تم تجاهل ${duplicatesCount} أفلام مكررة)`;
                    }
                    showToast(message, 'success');

                    // تحديث فلاتر النجوم إذا تم الاستيراد لقسم أفلام النجوم
                    if (importCategory === 'stars' && appState.currentCategory === 'stars' && appState.sortBy === 'star') {
                        updateFilterVisibility();
                    }
                }
                // إعادة تعيين الحماية
                handleMoviesImportFiles._isRunning = false;
            }, 500);
            return;
        }

        // تحديث مؤشر التقدم قبل بدء معالجة الملف
        updateProgressIndicator('movies-import-progress', totalImportedItems, Math.max(totalItemsCount, 1),
            `استيراد الأفلام (${totalImportedItems}/${Math.max(totalItemsCount, 1)})`);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // حساب إجمالي عدد العناصر
                const itemsCount = countItemsInData(data);
                totalItemsCount += itemsCount;

                // تحديث مؤشر التقدم
                updateProgressIndicator('movies-import-progress', totalImportedItems, totalItemsCount,
                    `استيراد الأفلام (${totalImportedItems}/${totalItemsCount})`);

                // استخدام setTimeout لتجنب تهنيج الصفحة أثناء معالجة البيانات
                setTimeout(async () => {
                    try {
                        const result = await importMoviesData(data, importCategory, defaultStarName);
                        totalImportedItems += result.importedCount;
                        duplicatesCount += result.duplicatesCount;
                        filesProcessed++;

                        // تحديث مؤشر التقدم
                        updateProgressIndicator('movies-import-progress', totalImportedItems, totalItemsCount,
                            `استيراد الأفلام (${totalImportedItems}/${totalItemsCount})`);

                        // معالجة الملف التالي
                        setTimeout(() => processFile(index + 1), 10);
                    } catch (error) {
                        console.error('خطأ في استيراد البيانات:', error);
                        showToast(`خطأ في استيراد البيانات من الملف: ${files[index].name}`, 'error');
                        filesProcessed++;
                        setTimeout(() => processFile(index + 1), 10);
                    }
                }, 10);
            } catch (error) {
                console.error('خطأ في تحليل ملف JSON:', error);
                showToast(`خطأ في تحليل ملف JSON: ${files[index].name}`, 'error');
                filesProcessed++;

                // تحديث مؤشر التقدم حتى في حالة الخطأ
                updateProgressIndicator('movies-import-progress', totalImportedItems, Math.max(totalItemsCount, 1),
                    `استيراد الأفلام (${totalImportedItems}/${Math.max(totalItemsCount, 1)}) - خطأ في الملف الحالي`);

                // معالجة الملف التالي
                setTimeout(() => processFile(index + 1), 10);
            } finally {
                // إعادة تعيين الحماية في حالة انتهاء جميع الملفات أو حدوث خطأ
                if (index >= files.length - 1) {
                    setTimeout(() => {
                        handleMoviesImportFiles._isRunning = false;
                    }, 1000);
                }
            }
        };

        reader.onerror = (e) => {
            console.error('خطأ في قراءة الملف:', e);
            showToast(`خطأ في قراءة الملف: ${files[index].name}`, 'error');
            filesProcessed++;

            // تحديث مؤشر التقدم حتى في حالة الخطأ
            updateProgressIndicator('movies-import-progress', totalImportedItems, Math.max(totalItemsCount, 1),
                `استيراد الأفلام (${totalImportedItems}/${Math.max(totalItemsCount, 1)}) - خطأ في قراءة الملف`);

            // معالجة الملف التالي
            setTimeout(() => processFile(index + 1), 10);

            // إعادة تعيين الحماية في حالة انتهاء جميع الملفات
            if (index >= files.length - 1) {
                setTimeout(() => {
                    handleMoviesImportFiles._isRunning = false;
                }, 1000);
            }
        };

        try {
            reader.readAsText(files[index]);
        } catch (error) {
            console.error('خطأ في بدء قراءة الملف:', error);
            showToast(`خطأ في قراءة الملف: ${files[index].name}`, 'error');
            filesProcessed++;

            // تحديث مؤشر التقدم حتى في حالة الخطأ
            updateProgressIndicator('movies-import-progress', totalImportedItems, Math.max(totalItemsCount, 1),
                `استيراد الأفلام (${totalImportedItems}/${Math.max(totalItemsCount, 1)}) - خطأ في قراءة الملف`);

            // معالجة الملف التالي
            setTimeout(() => processFile(index + 1), 10);

            // إعادة تعيين الحماية في حالة انتهاء جميع الملفات
            if (index >= files.length - 1) {
                setTimeout(() => {
                    handleMoviesImportFiles._isRunning = false;
                }, 1000);
            }
        }
    };

    // بدء معالجة الملفات
    processFile(0);
}

// استيراد بيانات الأفلام إلى قسم محدد
async function importMoviesData(data, categoryId, defaultStarName = '') {
    let importedCount = 0;
    let duplicatesCount = 0;

    // البحث عن البيانات الصحيحة
    if (data.series_info) {
        // استيراد المسلسلات
        for (const series of data.series_info) {
            const newSeries = {
                id: generateUniqueId(),
                name: series.series_name || series.movies_name || series.title || '',
                img: series.series_img || series.movies_img || series.imageUrl || '',
                href: series.series_href || series.movies_href || series.link || '',
                category: 'series',
                addedDate: new Date().toISOString(),
                hidden: false
            };

            // إضافة الأقسام الفرعية إذا كانت موجودة في البيانات المستوردة
            if (series.subCategories && Array.isArray(series.subCategories)) {
                newSeries.subCategories = [...series.subCategories];
            }

            if (!isDuplicateMovieInArray(newSeries, appState.series)) {
                appState.series.push(newSeries);
                importedCount++;
            } else {
                duplicatesCount++;
            }
        }
    } else if (data.movies_info) {
        // استيراد الأفلام مع معالجة على دفعات للملفات الكبيرة
        const batchSize = 50; // حجم الدفعة
        for (let i = 0; i < data.movies_info.length; i += batchSize) {
            const batch = data.movies_info.slice(i, i + batchSize);

            for (const movie of batch) {
                const newMovie = {
                    id: generateUniqueId(),
                    name: movie.movies_name || movie.title || '',
                    img: movie.movies_img || movie.imageUrl || '',
                    href: movie.movies_href || movie.link || '',
                    category: categoryId,
                    addedDate: new Date().toISOString(),
                    hidden: false
                };

                // إضافة اسم النجم إذا كان القسم هو "أفلام النجوم"
                if (categoryId === 'stars') {
                    newMovie.starName = movie.starName || movie.star_name || defaultStarName || '';
                }

                // إضافة الأقسام الفرعية إذا كانت موجودة في البيانات المستوردة
                if (movie.subCategories && Array.isArray(movie.subCategories)) {
                    newMovie.subCategories = [...movie.subCategories];
                } else if (categoryId.startsWith('selected') || categoryId.startsWith('favorite') || categoryId.startsWith('selected-rs')) {
                    // إذا كان القسم المستهدف هو قسم فرعي، أضف الفيلم إلى هذا القسم الفرعي
                    newMovie.subCategories = [categoryId];
                }

                if (!isDuplicateMovieInArray(newMovie, appState.movies)) {
                    appState.movies.push(newMovie);
                    importedCount++;
                } else {
                    duplicatesCount++;
                }
            }

            // إعطاء فرصة للمتصفح للتنفس بين الدفعات
            if (i + batchSize < data.movies_info.length) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
    } else if (Array.isArray(data)) {
        // أنماط بديلة من الأرايات
        for (const item of data) {
            const movieData = {
                id: generateUniqueId(),
                addedDate: new Date().toISOString(),
                hidden: false,
                category: categoryId
            };

            // محاولة استخراج البيانات من الأنماط المختلفة
            if (item.movies_name || item.series_name || item.title || item.name) {
                movieData.name = item.movies_name || item.series_name || item.title || item.name || '';
            }

            if (item.movies_img || item.series_img || item.imageUrl || item.img) {
                movieData.img = item.movies_img || item.series_img || item.imageUrl || item.img || '';
            }

            if (item.movies_href || item.series_href || item.link || item.href) {
                movieData.href = item.movies_href || item.series_href || item.link || item.href || '';
            }

            // إضافة اسم النجم إذا كان القسم هو "أفلام النجوم"
            if (categoryId === 'stars') {
                movieData.starName = item.starName || item.star_name || defaultStarName || '';
            }

            // إضافة الأقسام الفرعية إذا كانت موجودة في البيانات المستوردة
            if (item.subCategories && Array.isArray(item.subCategories)) {
                movieData.subCategories = [...item.subCategories];
            } else if (categoryId.startsWith('selected') || categoryId.startsWith('favorite') || categoryId.startsWith('selected-rs')) {
                // إذا كان القسم المستهدف هو قسم فرعي، أضف الفيلم إلى هذا القسم الفرعي
                movieData.subCategories = [categoryId];
            }

            if (!isDuplicateMovieInArray(movieData, appState.movies)) {
                appState.movies.push(movieData);
                importedCount++;
            } else {
                duplicatesCount++;
            }
        }
    }

    return { importedCount, duplicatesCount };
}

// التحقق من وجود فيلم مكرر في مصفوفة
function isDuplicateMovieInArray(movie, array) {
    // استثناء للأفلام في قسم أفلام النجوم - السماح بإضافة الأفلام المكررة
    if (movie.category === 'stars') {
        return false;
    }

    return array.some(item =>
        (item.name === movie.name && item.name !== '') ||
        (item.href === movie.href && item.href !== '')
    );
}

// إضافة فيلم جديد
function addNewMovie() {
    const nameInput = document.getElementById('movie-name');
    const imgInput = document.getElementById('movie-img');
    const hrefInput = document.getElementById('movie-href');
    const categorySelect = document.getElementById('movie-category');
    const starNameInput = document.getElementById('star-name');

    const name = nameInput.value.trim();
    const img = imgInput.value.trim();
    const href = hrefInput.value.trim();
    const category = categorySelect.value;

    if (!name) {
        showToast('يرجى إدخال اسم الفيلم/المسلسل', 'warning');
        return;
    }

    if (!category) {
        showToast('يرجى اختيار قسم', 'warning');
        return;
    }

    // التحقق من وجود نسخة مكررة من الفيلم
    if (isDuplicateMovie(name, href, category)) {
        showToast('هذا الفيلم موجود بالفعل في هذا القسم', 'warning');
        return;
    }

    // إنشاء بيانات الفيلم/المسلسل
    const movieData = {
        id: generateUniqueId(),
        name: name,
        img: img,
        href: href,
        category: category,
        addedDate: new Date().toISOString(),
        hidden: false
    };

    // إضافة اسم النجم إذا كان القسم هو "أفلام النجوم"
    if (category === 'stars') {
        movieData.starName = starNameInput.value.trim();
    }

    // إضافة الفيلم/المسلسل إلى المصفوفة المناسبة
    if (category === 'series') {
        appState.series.push(movieData);
    } else {
        appState.movies.push(movieData);
    }

    // حفظ البيانات وتحديث الواجهة
    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // إعادة تعيين النموذج
    nameInput.value = '';
    imgInput.value = '';
    hrefInput.value = '';
    starNameInput.value = '';

    showToast(`تمت إضافة "${name}" بنجاح`, 'success');

    // تحديث العرض إذا كان القسم الحالي هو نفس القسم المضاف إليه
    if (appState.currentCategory === category || appState.currentCategory === 'all') {
        displayMovies(appState.currentCategory, appState.currentPage);
    }

    // تحديث فلاتر النجوم إذا تم إضافة فيلم لقسم أفلام النجوم
    if (category === 'stars' && appState.currentCategory === 'stars' && appState.sortBy === 'star') {
        updateFilterVisibility();
    }
}

// التحقق من وجود فيلم مكرر
function isDuplicateMovie(name, href, category) {
    // التحقق من وجود الاسم والرابط معاً في نفس القسم
    if (category === 'series') {
        return appState.series.some(item =>
            (item.name === name || item.href === href) &&
            item.category === category &&
            !item.hidden
        );
    } else {
        return appState.movies.some(item =>
            (item.name === name || item.href === href) &&
            item.category === category &&
            !item.hidden
        );
    }
}

// معالجة السحب والإفلات لقسم S3
function handleDropToS3Zone(dataTransfer) {
    console.log('معالجة البيانات المسحوبة لقسم S3');

    // إظهار رسالة بداية المعالجة
    showToast('🔍 جاري فحص البيانات المسحوبة لقسم الاكس S3...', 'info');

    // محاولة الحصول على النص بطرق مختلفة
    let text = dataTransfer.getData('text/plain') ||
               dataTransfer.getData('text/uri-list') ||
               dataTransfer.getData('text/html');

    console.log('النص المسحوب:', text);

    if (text) {
        // تنظيف النص من HTML tags إذا كان موجوداً
        if (text.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            text = tempDiv.textContent || tempDiv.innerText || '';
        }

        if (text.trim()) {
            console.log('إرسال النص لمعالجة S3:', text.trim());
            showToast('🔄 جاري معالجة الروابط وإضافتها لقسم الاكس S3...', 'info');

            // تأخير قصير لضمان ظهور الرسالة قبل المعالجة
            setTimeout(() => {
                handleS3Links(text.trim());
            }, 200);
        } else {
            showToast('⚠️ لم يتم العثور على نص صالح للإضافة لقسم الاكس S3', 'warning');
        }
    } else {
        console.warn('لم يتم العثور على بيانات نصية في الإفلات');
        showToast('❌ فشل في السحب والإفلات لقسم الاكس S3\n🔍 السبب: لم يتم العثور على نص أو روابط في العنصر المسحوب\n💡 الحل: تأكد من سحب نص يحتوي على روابط صحيحة', 'error');
    }
}

// معالجة السحب والإفلات لقسم S SITES
function handleDropToSitesZone(dataTransfer) {
    console.log('معالجة البيانات المسحوبة لقسم S SITES');

    // إظهار رسالة بداية المعالجة
    showToast('🔍 جاري فحص البيانات المسحوبة لقسم S SITES...', 'info');

    // محاولة الحصول على النص بطرق مختلفة
    let text = dataTransfer.getData('text/plain') ||
               dataTransfer.getData('text/uri-list') ||
               dataTransfer.getData('text/html');

    console.log('النص المسحوب:', text);

    if (text) {
        // تنظيف النص من HTML tags إذا كان موجوداً
        if (text.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            text = tempDiv.textContent || tempDiv.innerText || '';
        }

        if (text.trim()) {
            console.log('إرسال النص لمعالجة S SITES:', text.trim());
            showToast('🔄 جاري معالجة الروابط وإضافتها لقسم S SITES...', 'info');

            // تأخير قصير لضمان ظهور الرسالة قبل المعالجة
            setTimeout(() => {
                handleSitesLinks(text.trim());
            }, 200);
        } else {
            showToast('⚠️ لم يتم العثور على نص صالح للإضافة لقسم S SITES', 'warning');
        }
    } else {
        console.warn('لم يتم العثور على بيانات نصية في الإفلات');
        showToast('❌ فشل في السحب والإفلات لقسم S SITES\n🔍 السبب: لم يتم العثور على نص أو روابط في العنصر المسحوب\n💡 الحل: تأكد من سحب نص يحتوي على روابط صحيحة', 'error');
    }
}

// معالجة روابط قسم S3
function handleS3Links(linksText) {
    console.log('بدء معالجة روابط قسم S3:', linksText);

    if (!linksText || !linksText.trim()) {
        showToast('❌ فشل في إضافة الروابط لقسم الاكس S3\n🔍 السبب: لم يتم إدخال أي نص أو روابط\n💡 الحل: قم بلصق روابط الأفلام في الحقل المخصص', 'error');
        return;
    }

    // تقسيم النص إلى روابط (دعم أسطر متعددة ومسافات)
    const links = linksText.split(/[\n\r\s]+/).filter(link => {
        const trimmed = link.trim();
        // التحقق من أن النص يبدو كرابط
        return trimmed && (trimmed.startsWith('http') || trimmed.includes('.'));
    });

    console.log('الروابط المستخرجة:', links);

    if (links.length === 0) {
        showToast('❌ فشل في إضافة الروابط لقسم الاكس S3\n🔍 السبب: النص المدخل لا يحتوي على روابط صالحة\n💡 الحل: تأكد من إدخال روابط تبدأ بـ http أو تحتوي على نقاط (.)', 'error');
        return;
    }

    let addedCount = 0;
    let duplicatesCount = 0;
    let invalidCount = 0;

    links.forEach(link => {
        const trimmedLink = link.trim();
        if (trimmedLink) {
            try {
                // التحقق من صحة الرابط
                new URL(trimmedLink.startsWith('http') ? trimmedLink : 'http://' + trimmedLink);

                // استخراج اسم الفيلم من الرابط
                const movieName = extractMovieNameFromUrl(trimmedLink);

                // التحقق من عدم وجود الفيلم مسبقاً
                if (!isDuplicateMovie(movieName, trimmedLink, 's3')) {
                    const newMovie = {
                        id: generateUniqueId(),
                        name: movieName,
                        img: '', // يمكن إضافة صورة افتراضية لاحقاً
                        href: trimmedLink.startsWith('http') ? trimmedLink : 'http://' + trimmedLink,
                        category: 's3',
                        addedDate: new Date().toISOString(),
                        hidden: false
                    };

                    appState.movies.push(newMovie);
                    addedCount++;
                    console.log('تمت إضافة فيلم جديد:', movieName);
                } else {
                    duplicatesCount++;
                    console.log('فيلم مكرر:', movieName);
                }
            } catch (error) {
                invalidCount++;
                console.warn('رابط غير صحيح:', trimmedLink);
            }
        }
    });

    // حفظ البيانات وتحديث الواجهة
    if (addedCount > 0) {
        saveAppData();
        updateCategoriesCounts();
        renderCategories();

        // تحديث العرض إذا كان القسم الحالي هو S3
        if (appState.currentCategory === 's3') {
            displayMovies('s3', appState.currentPage);
        }
    }

    // إظهار رسائل تنبيه مفصلة للنجاح والفشل
    if (addedCount > 0) {
        // رسالة النجاح الأساسية
        let successMessage = `🎉 نجحت العملية! تم إضافة ${addedCount} فيلم جديد إلى قسم الاكس S3`;

        // إضافة تفاصيل إضافية إذا وجدت
        let detailsMessage = '';
        if (duplicatesCount > 0) {
            detailsMessage += `\n📋 تم تجاهل ${duplicatesCount} فيلم مكرر (موجود مسبقاً)`;
        }
        if (invalidCount > 0) {
            detailsMessage += `\n🚫 تم تجاهل ${invalidCount} رابط غير صالح`;
        }

        showToast(successMessage + detailsMessage, 'success');

        // رسالة تأكيد إضافية بعد 3 ثوان
        setTimeout(() => {
            showToast(`✨ تم! الأفلام الجديدة متاحة الآن في قسم الاكس S3 ويمكنك مشاهدتها`, 'success');
        }, 3000);

    } else {
        // رسائل الفشل مع أسباب مفصلة
        let failureMessage = '❌ فشلت عملية الإضافة لقسم الاكس S3';
        let reasonMessage = '';

        if (duplicatesCount > 0 && invalidCount > 0) {
            reasonMessage = `\n🔍 السبب: جميع الروابط إما مكررة (${duplicatesCount}) أو غير صالحة (${invalidCount})`;
            failureMessage += '\n💡 الحل: تأكد من إدخال روابط جديدة وصحيحة';
        } else if (duplicatesCount > 0) {
            reasonMessage = `\n🔍 السبب: جميع الروابط (${duplicatesCount}) موجودة مسبقاً في القسم`;
            failureMessage += '\n💡 الحل: جرب روابط أفلام جديدة لم تتم إضافتها من قبل';
        } else if (invalidCount > 0) {
            reasonMessage = `\n🔍 السبب: جميع الروابط (${invalidCount}) غير صالحة أو تالفة`;
            failureMessage += '\n💡 الحل: تأكد من صحة الروابط وأنها تبدأ بـ http أو https';
        } else {
            reasonMessage = '\n🔍 السبب: لم يتم العثور على أي روابط صالحة في النص المدخل';
            failureMessage += '\n💡 الحل: تأكد من لصق روابط صحيحة أو سحب نص يحتوي على روابط';
        }

        showToast(failureMessage + reasonMessage, 'error');
    }
}

// معالجة روابط قسم S SITES
function handleSitesLinks(linksText) {
    console.log('بدء معالجة روابط قسم S SITES:', linksText);

    if (!linksText || !linksText.trim()) {
        showToast('❌ فشل في إضافة الروابط لقسم S SITES\n🔍 السبب: لم يتم إدخال أي نص أو روابط\n💡 الحل: قم بلصق روابط الأفلام في الحقل المخصص', 'error');
        return;
    }

    // تقسيم النص إلى روابط (دعم أسطر متعددة ومسافات)
    const links = linksText.split(/[\n\r\s]+/).filter(link => {
        const trimmed = link.trim();
        // التحقق من أن النص يبدو كرابط
        return trimmed && (trimmed.startsWith('http') || trimmed.includes('.'));
    });

    console.log('الروابط المستخرجة:', links);

    if (links.length === 0) {
        showToast('❌ فشل في إضافة الروابط لقسم S SITES\n🔍 السبب: النص المدخل لا يحتوي على روابط صالحة\n💡 الحل: تأكد من إدخال روابط تبدأ بـ http أو تحتوي على نقاط (.)', 'error');
        return;
    }

    let addedCount = 0;
    let duplicatesCount = 0;
    let invalidCount = 0;

    links.forEach(link => {
        const trimmedLink = link.trim();
        if (trimmedLink) {
            try {
                // التحقق من صحة الرابط
                new URL(trimmedLink.startsWith('http') ? trimmedLink : 'http://' + trimmedLink);

                // استخراج اسم الفيلم من الرابط
                const movieName = extractMovieNameFromUrl(trimmedLink);

                // التحقق من عدم وجود الفيلم مسبقاً
                if (!isDuplicateMovie(movieName, trimmedLink, 's-sites')) {
                    const newMovie = {
                        id: generateUniqueId(),
                        name: movieName,
                        img: '', // يمكن إضافة صورة افتراضية لاحقاً
                        href: trimmedLink.startsWith('http') ? trimmedLink : 'http://' + trimmedLink,
                        category: 's-sites',
                        addedDate: new Date().toISOString(),
                        hidden: false
                    };

                    appState.movies.push(newMovie);
                    addedCount++;
                    console.log('تمت إضافة فيلم جديد:', movieName);
                } else {
                    duplicatesCount++;
                    console.log('فيلم مكرر:', movieName);
                }
            } catch (error) {
                invalidCount++;
                console.warn('رابط غير صحيح:', trimmedLink);
            }
        }
    });

    // حفظ البيانات وتحديث الواجهة
    if (addedCount > 0) {
        saveAppData();
        updateCategoriesCounts();
        renderCategories();

        // تحديث العرض إذا كان القسم الحالي هو S SITES
        if (appState.currentCategory === 's-sites') {
            displayMovies('s-sites', appState.currentPage);
        }
    }

    // إظهار رسائل تنبيه مفصلة للنجاح والفشل
    if (addedCount > 0) {
        // رسالة النجاح الأساسية
        let successMessage = `🎉 نجحت العملية! تم إضافة ${addedCount} فيلم جديد إلى قسم S SITES`;

        // إضافة تفاصيل إضافية إذا وجدت
        let detailsMessage = '';
        if (duplicatesCount > 0) {
            detailsMessage += `\n📋 تم تجاهل ${duplicatesCount} فيلم مكرر (موجود مسبقاً)`;
        }
        if (invalidCount > 0) {
            detailsMessage += `\n🚫 تم تجاهل ${invalidCount} رابط غير صالح`;
        }

        showToast(successMessage + detailsMessage, 'success');

        // رسالة تأكيد إضافية بعد 3 ثوان
        setTimeout(() => {
            showToast(`✨ تم! الأفلام الجديدة متاحة الآن في قسم S SITES ويمكنك مشاهدتها`, 'success');
        }, 3000);

    } else {
        // رسائل الفشل مع أسباب مفصلة
        let failureMessage = '❌ فشلت عملية الإضافة لقسم S SITES';
        let reasonMessage = '';

        if (duplicatesCount > 0 && invalidCount > 0) {
            reasonMessage = `\n🔍 السبب: جميع الروابط إما مكررة (${duplicatesCount}) أو غير صالحة (${invalidCount})`;
            failureMessage += '\n💡 الحل: تأكد من إدخال روابط جديدة وصحيحة';
        } else if (duplicatesCount > 0) {
            reasonMessage = `\n🔍 السبب: جميع الروابط (${duplicatesCount}) موجودة مسبقاً في القسم`;
            failureMessage += '\n💡 الحل: جرب روابط أفلام جديدة لم تتم إضافتها من قبل';
        } else if (invalidCount > 0) {
            reasonMessage = `\n🔍 السبب: جميع الروابط (${invalidCount}) غير صالحة أو تالفة`;
            failureMessage += '\n💡 الحل: تأكد من صحة الروابط وأنها تبدأ بـ http أو https';
        } else {
            reasonMessage = '\n🔍 السبب: لم يتم العثور على أي روابط صالحة في النص المدخل';
            failureMessage += '\n💡 الحل: تأكد من لصق روابط صحيحة أو سحب نص يحتوي على روابط';
        }

        showToast(failureMessage + reasonMessage, 'error');
    }
}

// استخراج اسم الفيلم من الرابط
function extractMovieNameFromUrl(url) {
    try {
        // إزالة البروتوكول والدومين
        const urlObj = new URL(url);
        let pathname = urlObj.pathname;

        // إزالة الامتدادات الشائعة
        pathname = pathname.replace(/\.(html|php|asp|aspx|jsp)$/i, '');

        // استخراج الجزء الأخير من المسار
        const segments = pathname.split('/').filter(segment => segment.length > 0);
        let movieName = segments[segments.length - 1] || 'فيلم جديد';

        // تنظيف الاسم
        movieName = movieName.replace(/[-_]/g, ' ');
        movieName = decodeURIComponent(movieName);

        // إزالة الأرقام والرموز الزائدة
        movieName = movieName.replace(/^\d+\s*/, ''); // إزالة الأرقام من البداية
        movieName = movieName.replace(/\s+/g, ' ').trim(); // تنظيف المسافات

        return movieName || 'فيلم جديد';
    } catch (error) {
        return 'فيلم جديد';
    }
}

// معالجة السحب والإفلات للاستيراد
function handleImportDrop(dataTransfer) {
    const files = dataTransfer.files;
    if (files && files.length > 0) {
        handleImportFiles(files);
    }
}

// معالجة ملفات الاستيراد المحسنة
function handleImportFiles(files) {
    // قراءة كل ملف كـ JSON
    let filesProcessed = 0;
    let totalImportedItems = 0;
    let totalItemsCount = 0;
    let currentFileItems = 0;

    // الحصول على سرعة الاستيراد المحددة
    const selectedSpeed = document.querySelector('input[name="import-speed"]:checked').value;
    const speedSettings = IMPORT_SPEED_SETTINGS[selectedSpeed];

    // حفظ سرعة الاستيراد المحددة كافتراضية إذا تم تفعيل الخيار
    if (localStorage.getItem('autoSaveImportSpeed') === 'true') {
        saveDefaultImportSpeed(selectedSpeed);
    }

    // إنشاء وإظهار مؤشر التقدم
    createProgressIndicator('import-progress');

    // تحليل الملفات أولاً لحساب إجمالي العناصر
    const analyzeFiles = async () => {
        updateProgressIndicator('import-progress', 0, 1, "جاري تحليل الملفات", "هذه العملية قد تستغرق بعض الوقت للملفات الكبيرة");

        for (let i = 0; i < files.length; i++) {
            if (window.importCancelled && window.importCancelled['import-progress']) {
                return false; // تم إلغاء العملية
            }

            try {
                const fileContent = await readFileAsync(files[i]);
                const data = JSON.parse(fileContent);
                const itemsCount = countItemsInData(data);
                totalItemsCount += itemsCount;

                updateProgressIndicator(
                    'import-progress',
                    i + 1,
                    files.length,
                    `تحليل الملفات (${i + 1}/${files.length})`,
                    `تم العثور على ${totalItemsCount} عنصر حتى الآن`
                );

                // إضافة تأخير بناءً على سرعة الاستيراد المحددة
                if (i < files.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, speedSettings.analyzeDelay));
                }
            } catch (error) {
                console.error('خطأ في تحليل ملف JSON:', error);
            }
        }

        return true; // تم الانتهاء من التحليل بنجاح
    };

    // قراءة الملف كوعد
    const readFileAsync = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    // معالجة البيانات على دفعات
const processBatch = (data, startIndex, callback) => {
    return new Promise((resolve) => {
        const endIndex = Math.min(startIndex + speedSettings.batchSize, data.length);
        const batch = data.slice(startIndex, endIndex);

        // استخدام requestAnimationFrame لضمان تزامن التحديثات مع دورة رسم المتصفح
        requestAnimationFrame(() => {
            setTimeout(() => {
                callback(batch);
                resolve(endIndex);
            }, speedSettings.timeout);
        });
    });
};

    // معالجة ملف واحد
    const processFile = async (index) => {
        if (index >= files.length || (window.importCancelled && window.importCancelled['import-progress'])) {
            // انتهت معالجة جميع الملفات أو تم الإلغاء
            if (!(window.importCancelled && window.importCancelled['import-progress'])) {
                // إزالة مؤشر التقدم بعد انتهاء الاستيراد
                updateProgressIndicator(
                    'import-progress',
                    totalItemsCount,
                    totalItemsCount,
                    `تم الانتهاء من الاستيراد`,
                    `تم استيراد ${totalImportedItems} عنصر من ${filesProcessed} ملف بنجاح`
                );

                setTimeout(() => {
                    removeProgressIndicator('import-progress');
                    showToast(`تم استيراد ${totalImportedItems} عنصر من ${filesProcessed} ملف بنجاح`, 'success');

                    // تحديث فلاتر النجوم إذا كان القسم الحالي هو أفلام النجوم
                    if (appState.currentCategory === 'stars' && appState.sortBy === 'star') {
                        updateFilterVisibility();
                    }
                }, 1000);
            }
            return;
        }

        try {
            const fileContent = await readFileAsync(files[index]);
            const data = JSON.parse(fileContent);

            // حساب عدد العناصر في هذا الملف
            currentFileItems = countItemsInData(data);
            let processedItems = 0;

            // تحديث مؤشر التقدم
            updateProgressIndicator(
                'import-progress',
                totalImportedItems,
                totalItemsCount,
                `استيراد الملف ${index + 1} من ${files.length}`,
                `جاري معالجة ${currentFileItems} عنصر`
            );

            // معالجة البيانات على دفعات
            if (data.movies && data.movies.length > 0) {
                // معالجة الأفلام على دفعات
                let startIndex = 0;

                while (startIndex < data.movies.length && !(window.importCancelled && window.importCancelled['import-progress'])) {
                    startIndex = await processBatch(data.movies, startIndex, (batch) => {
                        const filteredBatch = batch.filter(movie => !isDuplicateMovieInArray(movie, appState.movies));
                        appState.movies.push(...filteredBatch);
                        processedItems += filteredBatch.length;
                        totalImportedItems += filteredBatch.length;

                        // تحديث مؤشر التقدم
                        updateProgressIndicator(
                            'import-progress',
                            totalImportedItems,
                            totalItemsCount,
                            `استيراد الملف ${index + 1} من ${files.length}`,
                            `تمت معالجة ${processedItems} من ${currentFileItems} عنصر`
                        );
                    });
                }
            }

            // معالجة المسلسلات بنفس الطريقة
            if (data.series && data.series.length > 0) {
                let startIndex = 0;

                while (startIndex < data.series.length && !(window.importCancelled && window.importCancelled['import-progress'])) {
                    startIndex = await processBatch(data.series, startIndex, (batch) => {
                        const filteredBatch = batch.filter(series => !isDuplicateMovieInArray(series, appState.series));
                        appState.series.push(...filteredBatch);
                        processedItems += filteredBatch.length;
                        totalImportedItems += filteredBatch.length;

                        // تحديث مؤشر التقدم
                        updateProgressIndicator(
                            'import-progress',
                            totalImportedItems,
                            totalItemsCount,
                            `استيراد الملف ${index + 1} من ${files.length}`,
                            `تمت معالجة ${processedItems} من ${currentFileItems} عنصر`
                        );
                    });
                }
            }

            // استيراد الأقسام والإعدادات
            if (data.categories) {
                appState.categories = data.categories;
            }

            if (data.settings) {
                appState.showSpecialSections = data.settings.showSpecialSections;
                appState.viewMode = data.settings.viewMode || 'grid';
                appState.sortBy = data.settings.sortBy || 'name';
                appState.itemsPerPage = data.settings.itemsPerPage || 50;
            }

            filesProcessed++;

            // حفظ البيانات كل ملف لتجنب فقدان البيانات
            saveAppData();
            updateCategoriesCounts();
            renderCategories();

            // معالجة الملف التالي
            setTimeout(() => processFile(index + 1), speedSettings.timeout);

        } catch (error) {
            console.error('خطأ في تحليل ملف JSON:', error);
            showToast(`خطأ في تحليل ملف JSON: ${files[index].name}`, 'error');
            filesProcessed++;

            // معالجة الملف التالي
            setTimeout(() => processFile(index + 1), speedSettings.timeout);
        }
    };

    // بدء العملية
    analyzeFiles().then(success => {
        if (success) {
            // بدء معالجة الملفات
            processFile(0);
        }
    });
}

// معالجة ملفات الاستيراد المحسن مع المزامنة
async function handleEnhancedImportFiles(files) {
    if (!files || files.length === 0) {
        showToast('لم يتم اختيار أي ملفات', 'warning');
        return;
    }

    const progressId = 'enhanced-import-progress';
    let startTime = Date.now();

    try {
        // إنشاء مؤشر التقدم المحسن
        createSyncProgressIndicator(progressId);

        // قراءة وتحليل جميع الملفات
        const allData = [];
        let totalItems = 0;
        let validFiles = 0;
        let invalidFiles = [];

        for (let i = 0; i < files.length; i++) {
            try {
                console.log(`قراءة الملف: ${files[i].name}`);
                const fileContent = await readFileAsync(files[i]);

                if (!fileContent || fileContent.trim() === '') {
                    invalidFiles.push(`${files[i].name}: ملف فارغ`);
                    continue;
                }

                const data = JSON.parse(fileContent);
                console.log('بيانات الملف:', data);

                const itemCount = countItemsInData(data);
                console.log(`عدد العناصر في ${files[i].name}: ${itemCount}`);

                if (itemCount > 0) {
                    allData.push(data);
                    totalItems += itemCount;
                    validFiles++;
                } else {
                    invalidFiles.push(`${files[i].name}: لا يحتوي على بيانات صالحة`);
                }
            } catch (error) {
                console.error(`خطأ في قراءة الملف ${files[i].name}:`, error);
                invalidFiles.push(`${files[i].name}: ${error.message}`);
            }
        }

        // عرض تفاصيل الملفات غير الصالحة
        if (invalidFiles.length > 0) {
            console.warn('ملفات غير صالحة:', invalidFiles);
        }

        if (allData.length === 0 || totalItems === 0) {
            removeSyncProgressIndicator(progressId);
            let errorMessage = 'لا توجد ملفات صالحة للاستيراد';
            if (invalidFiles.length > 0) {
                errorMessage += '\n\nالأخطاء:\n' + invalidFiles.join('\n');
            }
            showToast(errorMessage, 'error');
            return;
        }

        console.log(`تم العثور على ${validFiles} ملف صالح بإجمالي ${totalItems} عنصر`);

        // دمج جميع البيانات
        const mergedData = mergeImportData(allData);
        console.log('البيانات المدموجة:', mergedData);

        // التحقق من وجود بيانات صالحة بعد الدمج
        const finalItemCount = countItemsInData(mergedData);
        if (finalItemCount === 0) {
            removeSyncProgressIndicator(progressId);
            showToast('لا توجد بيانات صالحة للاستيراد بعد الدمج', 'warning');
            return;
        }

        console.log(`بدء المزامنة مع ${finalItemCount} عنصر`);

        // إعداد callback للتقدم
        let syncResults = {
            movies: { added: 0, updated: 0, skipped: 0, errors: 0 },
            series: { added: 0, updated: 0, skipped: 0, errors: 0 },
            categories: { added: 0, updated: 0, skipped: 0, errors: 0 },
            settings: { updated: false },
            totalProcessed: 0,
            totalItems: finalItemCount
        };

        const progressCallback = (progressData) => {
            // التحقق من الإلغاء
            if (window.syncCancelled && window.syncCancelled[progressId]) {
                throw new Error('تم إلغاء العملية');
            }

            updateSyncProgress(progressId, progressData, syncResults);
        };

        // بدء المزامنة المحسنة
        syncResults = await importAppDataEnhanced(mergedData, progressCallback);

        // حساب الوقت المستغرق
        const elapsedTime = Math.round((Date.now() - startTime) / 1000);

        // إظهار النتائج النهائية
        await showSyncResults(progressId, syncResults, elapsedTime);

    } catch (error) {
        console.error('خطأ في الاستيراد المحسن:', error);

        if (error.message === 'تم إلغاء العملية') {
            showToast('تم إلغاء عملية الاستيراد', 'warning');
        } else {
            showToast('حدث خطأ أثناء الاستيراد المحسن', 'error');
        }

        removeSyncProgressIndicator(progressId);
    }
}

// دمج بيانات الاستيراد من ملفات متعددة
function mergeImportData(dataArray) {
    console.log('دمج البيانات من', dataArray.length, 'ملف');

    const merged = {
        movies: [],
        series: [],
        categories: {
            main: [],
            sub: [],
            special: [],
            specialSub: []
        },
        settings: {}
    };

    dataArray.forEach((data, index) => {
        console.log(`معالجة الملف ${index + 1}:`, data);

        // دمج الأفلام
        if (data.movies && Array.isArray(data.movies)) {
            console.log(`إضافة ${data.movies.length} فيلم من الملف ${index + 1}`);
            merged.movies.push(...data.movies);
        } else if (data.movies_info && Array.isArray(data.movies_info)) {
            console.log(`إضافة ${data.movies_info.length} فيلم (movies_info) من الملف ${index + 1}`);
            merged.movies.push(...data.movies_info);
        }

        // دمج المسلسلات
        if (data.series && Array.isArray(data.series)) {
            console.log(`إضافة ${data.series.length} مسلسل من الملف ${index + 1}`);
            merged.series.push(...data.series);
        } else if (data.series_info && Array.isArray(data.series_info)) {
            console.log(`إضافة ${data.series_info.length} مسلسل (series_info) من الملف ${index + 1}`);
            merged.series.push(...data.series_info);
        }

        // التعامل مع البيانات كمصفوفة مباشرة (للملفات القديمة)
        if (Array.isArray(data)) {
            console.log(`إضافة ${data.length} عنصر كمصفوفة مباشرة من الملف ${index + 1}`);
            merged.movies.push(...data);
        }

        // دمج الأقسام
        if (data.categories && typeof data.categories === 'object') {
            ['main', 'sub', 'special', 'specialSub'].forEach(type => {
                if (Array.isArray(data.categories[type])) {
                    console.log(`إضافة ${data.categories[type].length} قسم من نوع ${type} من الملف ${index + 1}`);
                    merged.categories[type].push(...data.categories[type]);
                }
            });
        }

        // دمج الإعدادات
        if (data.settings && typeof data.settings === 'object') {
            console.log(`دمج الإعدادات من الملف ${index + 1}`);
            Object.assign(merged.settings, data.settings);
        }
    });

    // إزالة التكرارات
    const originalMoviesCount = merged.movies.length;
    const originalSeriesCount = merged.series.length;

    merged.movies = removeDuplicateItems(merged.movies, 'id');
    merged.series = removeDuplicateItems(merged.series, 'id');

    console.log(`تم إزالة ${originalMoviesCount - merged.movies.length} فيلم مكرر`);
    console.log(`تم إزالة ${originalSeriesCount - merged.series.length} مسلسل مكرر`);

    ['main', 'sub', 'special', 'specialSub'].forEach(type => {
        const originalCount = merged.categories[type].length;
        merged.categories[type] = removeDuplicateItems(merged.categories[type], 'id');
        if (originalCount > merged.categories[type].length) {
            console.log(`تم إزالة ${originalCount - merged.categories[type].length} قسم مكرر من نوع ${type}`);
        }
    });

    console.log('النتيجة النهائية للدمج:', {
        movies: merged.movies.length,
        series: merged.series.length,
        categories: {
            main: merged.categories.main.length,
            sub: merged.categories.sub.length,
            special: merged.categories.special.length,
            specialSub: merged.categories.specialSub.length
        },
        hasSettings: Object.keys(merged.settings).length > 0
    });

    return merged;
}

// إزالة العناصر المكررة
function removeDuplicateItems(items, keyField) {
    if (!Array.isArray(items)) return [];

    const seen = new Set();
    return items.filter(item => {
        if (!item || typeof item !== 'object') return false;

        // محاولة استخدام عدة مفاتيح للتعرف على العنصر
        let key = item[keyField];
        if (!key) {
            key = item.id || item.name || item.movies_name || item.series_name || item.title;
        }
        if (!key) {
            // إذا لم نجد مفتاح مناسب، استخدم hash للكائن كاملاً
            key = JSON.stringify(item);
        }

        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// عرض نتائج المزامنة
async function showSyncResults(progressId, syncResults, elapsedTime) {
    const container = document.getElementById(progressId);
    if (!container) return;

    // تحديث الواجهة لإظهار النتائج النهائية
    const phaseTitle = container.querySelector('.phase-title');
    const phaseSubtitle = container.querySelector('.phase-subtitle');
    const phaseIcon = container.querySelector('.phase-icon');
    const progressFill = container.querySelector('.sync-progress-fill');
    const progressText = container.querySelector('.sync-progress-text');
    const currentItemName = container.querySelector('.current-item-name');

    if (phaseTitle) phaseTitle.textContent = 'تم الانتهاء من المزامنة';
    if (phaseSubtitle) phaseSubtitle.textContent = `في ${elapsedTime} ثانية`;
    if (phaseIcon) phaseIcon.textContent = '✅';
    if (progressFill) progressFill.style.width = '100%';
    if (progressText) progressText.textContent = '100%';
    if (currentItemName) currentItemName.textContent = 'تم الانتهاء بنجاح';

    // تحديث الإحصائيات النهائية
    updateSyncStats(container, syncResults);

    // إنشاء رسالة النتائج
    const totalAdded = syncResults.movies.added + syncResults.series.added + syncResults.categories.added;
    const totalUpdated = syncResults.movies.updated + syncResults.series.updated + syncResults.categories.updated;
    const totalSkipped = syncResults.movies.skipped + syncResults.series.skipped + syncResults.categories.skipped;
    const totalErrors = syncResults.movies.errors + syncResults.series.errors + syncResults.categories.errors;

    let resultMessage = `تم الانتهاء من المزامنة:\n`;
    resultMessage += `• تم إضافة ${totalAdded} عنصر جديد\n`;
    resultMessage += `• تم تحديث ${totalUpdated} عنصر موجود\n`;
    resultMessage += `• تم تجاهل ${totalSkipped} عنصر مكرر\n`;
    if (totalErrors > 0) {
        resultMessage += `• حدثت أخطاء في ${totalErrors} عنصر\n`;
    }
    resultMessage += `• الوقت المستغرق: ${elapsedTime} ثانية`;

    // انتظار لثانيتين لعرض النتائج
    await new Promise(resolve => setTimeout(resolve, 2000));

    // إزالة مؤشر التقدم وإظهار النتيجة
    removeSyncProgressIndicator(progressId);
    showToast(resultMessage, totalErrors > 0 ? 'warning' : 'success');
}

// استيراد بيانات التطبيق المحسن مع مزامنة ذكية
async function importAppDataEnhanced(data, progressCallback = null) {
    const syncResults = {
        movies: { added: 0, updated: 0, skipped: 0, errors: 0 },
        series: { added: 0, updated: 0, skipped: 0, errors: 0 },
        categories: { added: 0, updated: 0, skipped: 0, errors: 0 },
        settings: { updated: false },
        totalProcessed: 0,
        totalItems: 0
    };

    // حساب إجمالي العناصر
    syncResults.totalItems = countItemsInData(data);

    try {
        // مزامنة الأفلام
        if (data.movies || data.movies_info) {
            const moviesResult = await syncMovies(data, progressCallback, syncResults);
            syncResults.movies = moviesResult;
        }

        // مزامنة المسلسلات
        if (data.series || data.series_info) {
            const seriesResult = await syncSeries(data, progressCallback, syncResults);
            syncResults.series = seriesResult;
        }

        // مزامنة الأقسام
        if (data.categories) {
            const categoriesResult = await syncCategories(data, progressCallback, syncResults);
            syncResults.categories = categoriesResult;
        }

        // مزامنة الإعدادات
        if (data.settings) {
            const settingsResult = await syncSettings(data, progressCallback, syncResults);
            syncResults.settings = settingsResult;
        }

        // حفظ البيانات وتحديث الواجهة
        await saveAppData();
        updateCategoriesCounts();
        renderCategories();
        displayMovies('all', 1);
        toggleSpecialSectionsVisibility();
        applyZoom();

        return syncResults;
    } catch (error) {
        console.error('خطأ في الاستيراد المحسن:', error);
        throw error;
    }
}

// استيراد بيانات التطبيق (الوظيفة القديمة للتوافق)
function importAppData(data, checkDuplicates = false) {
    let importedCount = 0;

    // استيراد الأفلام
    if (data.movies) {
        data.movies.forEach(movie => {
            let foundIdx = appState.movies.findIndex(m => m.id === movie.id || m.name === movie.name);
            if (foundIdx !== -1) {
                appState.movies[foundIdx] = { ...appState.movies[foundIdx], ...movie };
            } else {
                appState.movies.push(movie);
            }
        });
        importedCount += data.movies.length;
    } else if (data.movies_info) {
        // استيراد من الصيغة البديلة
        for (const movie of data.movies_info) {
            let foundIdx = appState.movies.findIndex(m => m.id === movie.id || m.name === movie.movies_name || m.name === movie.title);
            const newMovie = {
                id: movie.id || generateUniqueId(),
                name: movie.movies_name || movie.title || '',
                img: movie.movies_img || movie.imageUrl || '',
                href: movie.movies_href || movie.link || '',
                category: 'all',
                addedDate: movie.addedDate || new Date().toISOString(),
                hidden: movie.hidden || false
            };
            if (foundIdx !== -1) {
                appState.movies[foundIdx] = { ...appState.movies[foundIdx], ...newMovie };
            } else {
                appState.movies.push(newMovie);
            }
            importedCount++;
        }
    }

    // استيراد المسلسلات
    if (data.series) {
        data.series.forEach(series => {
            let foundIdx = appState.series.findIndex(s => s.id === series.id || s.name === series.name);
            if (foundIdx !== -1) {
                appState.series[foundIdx] = { ...appState.series[foundIdx], ...series };
            } else {
                appState.series.push(series);
            }
        });
        importedCount += data.series.length;
    } else if (data.series_info) {
        // استيراد من الصيغة البديلة
        for (const series of data.series_info) {
            let foundIdx = appState.series.findIndex(s => s.id === series.id || s.name === series.series_name || s.name === series.title);
            const newSeries = {
                id: series.id || generateUniqueId(),
                name: series.series_name || series.movies_name || series.title || '',
                img: series.series_img || series.movies_img || series.imageUrl || '',
                href: series.series_href || series.movies_href || series.link || '',
                category: 'series',
                addedDate: series.addedDate || new Date().toISOString(),
                hidden: series.hidden || false
            };
            if (foundIdx !== -1) {
                appState.series[foundIdx] = { ...appState.series[foundIdx], ...newSeries };
            } else {
                appState.series.push(newSeries);
            }
            importedCount++;
        }
    }

    // استيراد الأقسام
    if (data.categories) {
        // تحديث أو إضافة الأقسام الرئيسية
        if (Array.isArray(data.categories.main)) {
            data.categories.main.forEach(importedCat => {
                let idx = appState.categories.main.findIndex(cat => cat.id === importedCat.id);
                if (idx !== -1) {
                    appState.categories.main[idx] = { ...appState.categories.main[idx], ...importedCat };
                } else {
                    appState.categories.main.push(importedCat);
                }
            });
        }
        // تحديث أو إضافة الأقسام الفرعية
        if (Array.isArray(data.categories.sub)) {
            data.categories.sub.forEach(importedCat => {
                let idx = appState.categories.sub.findIndex(cat => cat.id === importedCat.id);
                if (idx !== -1) {
                    appState.categories.sub[idx] = { ...appState.categories.sub[idx], ...importedCat };
                } else {
                    appState.categories.sub.push(importedCat);
                }
            });
        }
        // تحديث أو إضافة الأقسام الخاصة
        if (Array.isArray(data.categories.special)) {
            data.categories.special.forEach(importedCat => {
                let idx = appState.categories.special.findIndex(cat => cat.id === importedCat.id);
                if (idx !== -1) {
                    appState.categories.special[idx] = { ...appState.categories.special[idx], ...importedCat };
                } else {
                    appState.categories.special.push(importedCat);
                }
            });
        }
        // تحديث أو إضافة الأقسام الخاصة الفرعية
        if (Array.isArray(data.categories.specialSub)) {
            data.categories.specialSub.forEach(importedCat => {
                let idx = appState.categories.specialSub.findIndex(cat => cat.id === importedCat.id);
                if (idx !== -1) {
                    appState.categories.specialSub[idx] = { ...appState.categories.specialSub[idx], ...importedCat };
                } else {
                    appState.categories.specialSub.push(importedCat);
                }
            });
        }
    }

    // استيراد الإعدادات
    if (data.settings) {
        appState.showSpecialSections = data.settings.showSpecialSections;
        appState.viewMode = data.settings.viewMode || 'grid';
        appState.sortBy = data.settings.sortBy || 'name';
        appState.itemsPerPage = data.settings.itemsPerPage || 50;
        appState.zoomLevel = data.settings.zoomLevel || 1; // استيراد مستوى التكبير
    }

    // تحديث واجهة المستخدم
    saveAppData();
    updateCategoriesCounts();
    renderCategories();
    displayMovies('all', 1); // هنا نريد الانتقال للأعلى عند استيراد البيانات
    toggleSpecialSectionsVisibility();

    // تطبيق مستوى التكبير المستورد
    applyZoom();

    return importedCount;
}

// مزامنة الأفلام مع عرض التقدم
async function syncMovies(data, progressCallback, syncResults) {
    const result = { added: 0, updated: 0, skipped: 0, errors: 0 };
    const movies = data.movies || data.movies_info || [];

    if (movies.length === 0) return result;

    for (let i = 0; i < movies.length; i++) {
        try {
            const movie = movies[i];

            // تحديث التقدم
            if (progressCallback) {
                progressCallback({
                    phase: 'movies',
                    current: i + 1,
                    total: movies.length,
                    item: movie.name || movie.movies_name || movie.title || 'فيلم غير معروف',
                    action: 'جاري معالجة الأفلام'
                });
            }

            // تحويل البيانات للصيغة الموحدة
            const normalizedMovie = normalizeMovieData(movie);

            // البحث عن الفيلم الموجود
            const foundIdx = appState.movies.findIndex(m =>
                m.id === normalizedMovie.id ||
                m.name === normalizedMovie.name ||
                (m.href && normalizedMovie.href && m.href === normalizedMovie.href)
            );

            if (foundIdx !== -1) {
                // تحديث الفيلم الموجود
                const existingMovie = appState.movies[foundIdx];
                const updatedMovie = mergeMovieData(existingMovie, normalizedMovie);

                // التحقق من وجود تغييرات فعلية
                if (hasMovieChanges(existingMovie, updatedMovie)) {
                    appState.movies[foundIdx] = updatedMovie;
                    result.updated++;
                } else {
                    result.skipped++;
                }
            } else {
                // إضافة فيلم جديد
                appState.movies.push(normalizedMovie);
                result.added++;
            }

            syncResults.totalProcessed++;

            // إضافة تأخير صغير لتجنب تجميد الواجهة
            if (i % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (error) {
            console.error('خطأ في معالجة الفيلم:', error);
            result.errors++;
        }
    }

    return result;
}

// مزامنة المسلسلات مع عرض التقدم
async function syncSeries(data, progressCallback, syncResults) {
    const result = { added: 0, updated: 0, skipped: 0, errors: 0 };
    const series = data.series || data.series_info || [];

    if (series.length === 0) return result;

    for (let i = 0; i < series.length; i++) {
        try {
            const seriesItem = series[i];

            // تحديث التقدم
            if (progressCallback) {
                progressCallback({
                    phase: 'series',
                    current: i + 1,
                    total: series.length,
                    item: seriesItem.name || seriesItem.series_name || seriesItem.movies_name || seriesItem.title || 'مسلسل غير معروف',
                    action: 'جاري معالجة المسلسلات'
                });
            }

            // تحويل البيانات للصيغة الموحدة
            const normalizedSeries = normalizeSeriesData(seriesItem);

            // البحث عن المسلسل الموجود
            const foundIdx = appState.series.findIndex(s =>
                s.id === normalizedSeries.id ||
                s.name === normalizedSeries.name ||
                (s.href && normalizedSeries.href && s.href === normalizedSeries.href)
            );

            if (foundIdx !== -1) {
                // تحديث المسلسل الموجود
                const existingSeries = appState.series[foundIdx];
                const updatedSeries = mergeSeriesData(existingSeries, normalizedSeries);

                // التحقق من وجود تغييرات فعلية
                if (hasSeriesChanges(existingSeries, updatedSeries)) {
                    appState.series[foundIdx] = updatedSeries;
                    result.updated++;
                } else {
                    result.skipped++;
                }
            } else {
                // إضافة مسلسل جديد
                appState.series.push(normalizedSeries);
                result.added++;
            }

            syncResults.totalProcessed++;

            // إضافة تأخير صغير لتجنب تجميد الواجهة
            if (i % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (error) {
            console.error('خطأ في معالجة المسلسل:', error);
            result.errors++;
        }
    }

    return result;
}

// مزامنة الأقسام مع عرض التقدم
async function syncCategories(data, progressCallback, syncResults) {
    const result = { added: 0, updated: 0, skipped: 0, errors: 0 };

    if (!data.categories) return result;

    const categoryTypes = ['main', 'sub', 'special', 'specialSub'];

    for (const type of categoryTypes) {
        if (Array.isArray(data.categories[type])) {
            const categories = data.categories[type];

            for (let i = 0; i < categories.length; i++) {
                try {
                    const category = categories[i];

                    // تحديث التقدم
                    if (progressCallback) {
                        progressCallback({
                            phase: 'categories',
                            current: i + 1,
                            total: categories.length,
                            item: category.name || category.id || 'قسم غير معروف',
                            action: `جاري معالجة الأقسام (${type})`
                        });
                    }

                    // البحث عن القسم الموجود
                    const foundIdx = appState.categories[type].findIndex(cat => cat.id === category.id);

                    if (foundIdx !== -1) {
                        // تحديث القسم الموجود
                        const existingCategory = appState.categories[type][foundIdx];
                        const updatedCategory = mergeCategoryData(existingCategory, category);

                        if (hasCategoryChanges(existingCategory, updatedCategory)) {
                            appState.categories[type][foundIdx] = updatedCategory;
                            result.updated++;
                        } else {
                            result.skipped++;
                        }
                    } else {
                        // إضافة قسم جديد
                        appState.categories[type].push(category);
                        result.added++;
                    }

                    syncResults.totalProcessed++;
                } catch (error) {
                    console.error('خطأ في معالجة القسم:', error);
                    result.errors++;
                }
            }
        }
    }

    return result;
}

// مزامنة الإعدادات
async function syncSettings(data, progressCallback, syncResults) {
    const result = { updated: false };

    if (!data.settings) return result;

    try {
        // تحديث التقدم
        if (progressCallback) {
            progressCallback({
                phase: 'settings',
                current: 1,
                total: 1,
                item: 'إعدادات التطبيق',
                action: 'جاري معالجة الإعدادات'
            });
        }

        // مزامنة الإعدادات
        if (data.settings.showSpecialSections !== undefined) {
            appState.showSpecialSections = data.settings.showSpecialSections;
        }
        if (data.settings.viewMode) {
            appState.viewMode = data.settings.viewMode;
        }
        if (data.settings.sortBy) {
            appState.sortBy = data.settings.sortBy;
        }
        if (data.settings.itemsPerPage) {
            appState.itemsPerPage = data.settings.itemsPerPage;
        }
        if (data.settings.zoomLevel) {
            appState.zoomLevel = data.settings.zoomLevel;
        }
        if (data.settings.openMoviesExternally !== undefined) {
            appState.openMoviesExternally = data.settings.openMoviesExternally;
        }

        result.updated = true;
        syncResults.totalProcessed++;
    } catch (error) {
        console.error('خطأ في معالجة الإعدادات:', error);
    }

    return result;
}

// تحويل بيانات الفيلم للصيغة الموحدة
function normalizeMovieData(movie) {
    return {
        id: movie.id || generateUniqueId(),
        name: movie.name || movie.movies_name || movie.title || '',
        img: movie.img || movie.movies_img || movie.imageUrl || '',
        href: movie.href || movie.movies_href || movie.link || '',
        category: movie.category || 'all',
        subCategories: movie.subCategories || [],
        specialSubCategories: movie.specialSubCategories || [],
        addedDate: movie.addedDate || new Date().toISOString(),
        hidden: movie.hidden || false,
        star: movie.star || '',
        site: movie.site || '',
        dateAdded: movie.dateAdded || movie.addedDate || new Date().toISOString()
    };
}

// تحويل بيانات المسلسل للصيغة الموحدة
function normalizeSeriesData(series) {
    return {
        id: series.id || generateUniqueId(),
        name: series.name || series.series_name || series.movies_name || series.title || '',
        img: series.img || series.series_img || series.movies_img || series.imageUrl || '',
        href: series.href || series.series_href || series.movies_href || series.link || '',
        category: series.category || 's1',
        subCategories: series.subCategories || [],
        specialSubCategories: series.specialSubCategories || [],
        addedDate: series.addedDate || new Date().toISOString(),
        hidden: series.hidden || false,
        star: series.star || '',
        site: series.site || '',
        dateAdded: series.dateAdded || series.addedDate || new Date().toISOString()
    };
}

// دمج بيانات الفيلم
function mergeMovieData(existing, imported) {
    return {
        ...existing,
        ...imported,
        // الاحتفاظ بالبيانات المهمة من الفيلم الموجود
        id: existing.id,
        addedDate: existing.addedDate || imported.addedDate,
        // دمج الأقسام الفرعية
        subCategories: [...new Set([...(existing.subCategories || []), ...(imported.subCategories || [])])],
        specialSubCategories: [...new Set([...(existing.specialSubCategories || []), ...(imported.specialSubCategories || [])])]
    };
}

// دمج بيانات المسلسل
function mergeSeriesData(existing, imported) {
    return {
        ...existing,
        ...imported,
        // الاحتفاظ بالبيانات المهمة من المسلسل الموجود
        id: existing.id,
        addedDate: existing.addedDate || imported.addedDate,
        // دمج الأقسام الفرعية
        subCategories: [...new Set([...(existing.subCategories || []), ...(imported.subCategories || [])])],
        specialSubCategories: [...new Set([...(existing.specialSubCategories || []), ...(imported.specialSubCategories || [])])]
    };
}

// دمج بيانات القسم
function mergeCategoryData(existing, imported) {
    return {
        ...existing,
        ...imported,
        // الاحتفاظ بالمعرف الأصلي
        id: existing.id,
        // دمج المواقع والمجلدات إذا كانت موجودة
        shortcuts: [...new Set([...(existing.shortcuts || []), ...(imported.shortcuts || [])])],
        folders: mergeFolders(existing.folders || [], imported.folders || [])
    };
}

// دمج المجلدات
function mergeFolders(existingFolders, importedFolders) {
    const merged = [...existingFolders];

    importedFolders.forEach(importedFolder => {
        const existingIndex = merged.findIndex(f => f.id === importedFolder.id || f.name === importedFolder.name);
        if (existingIndex !== -1) {
            // دمج المواقع في المجلد الموجود
            merged[existingIndex].sites = [...new Set([
                ...(merged[existingIndex].sites || []),
                ...(importedFolder.sites || [])
            ])];
        } else {
            // إضافة مجلد جديد
            merged.push(importedFolder);
        }
    });

    return merged;
}

// التحقق من وجود تغييرات في الفيلم
function hasMovieChanges(existing, updated) {
    const keys = ['name', 'img', 'href', 'category', 'star', 'site', 'hidden'];
    return keys.some(key => existing[key] !== updated[key]) ||
           JSON.stringify(existing.subCategories || []) !== JSON.stringify(updated.subCategories || []) ||
           JSON.stringify(existing.specialSubCategories || []) !== JSON.stringify(updated.specialSubCategories || []);
}

// التحقق من وجود تغييرات في المسلسل
function hasSeriesChanges(existing, updated) {
    return hasMovieChanges(existing, updated); // نفس المنطق
}

// التحقق من وجود تغييرات في القسم
function hasCategoryChanges(existing, updated) {
    const keys = ['name', 'count'];
    return keys.some(key => existing[key] !== updated[key]) ||
           JSON.stringify(existing.shortcuts || []) !== JSON.stringify(updated.shortcuts || []) ||
           JSON.stringify(existing.folders || []) !== JSON.stringify(updated.folders || []);
}

// قراءة الملف بشكل غير متزامن
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error(`خطأ في قراءة الملف: ${file.name}`));
        reader.readAsText(file);
    });
}

// حساب عدد العناصر في البيانات
function countItemsInData(data) {
    if (!data) return 0;

    let count = 0;

    // حساب الأفلام
    if (data.movies && Array.isArray(data.movies)) {
        count += data.movies.length;
    } else if (data.movies_info && Array.isArray(data.movies_info)) {
        count += data.movies_info.length;
    }

    // حساب المسلسلات
    if (data.series && Array.isArray(data.series)) {
        count += data.series.length;
    } else if (data.series_info && Array.isArray(data.series_info)) {
        count += data.series_info.length;
    }

    // حساب الأقسام
    if (data.categories) {
        ['main', 'sub', 'special', 'specialSub'].forEach(type => {
            if (Array.isArray(data.categories[type])) {
                count += data.categories[type].length;
            }
        });
    }

    // التعامل مع حالة وجود مصفوفة مباشرة (للأفلام أو المسلسلات)
    if (Array.isArray(data)) {
        count += data.length;
    }

    // إضافة عنصر واحد للإعدادات إذا كانت موجودة
    if (data.settings && typeof data.settings === 'object') {
        count += 1;
    }

    return count;
}

// إنشاء مؤشر التقدم المحسن للمزامنة
function createSyncProgressIndicator(id) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'sync-progress-container';
    progressContainer.id = id;

    progressContainer.innerHTML = `
        <div class="sync-progress-overlay">
            <div class="sync-progress-modal">
                <div class="sync-progress-header">
                    <h3>مزامنة البيانات</h3>
                    <button class="cancel-sync-btn" title="إلغاء العملية">✕</button>
                </div>

                <div class="sync-progress-body">
                    <div class="sync-current-phase">
                        <div class="phase-icon">📊</div>
                        <div class="phase-info">
                            <div class="phase-title">جاري التحليل...</div>
                            <div class="phase-subtitle">تحضير البيانات للمزامنة</div>
                        </div>
                    </div>

                    <div class="sync-progress-bar">
                        <div class="sync-progress-fill" style="width: 0%"></div>
                        <div class="sync-progress-text">0%</div>
                    </div>

                    <div class="sync-stats-grid">
                        <div class="sync-stat-item">
                            <div class="stat-label">الأفلام</div>
                            <div class="stat-values">
                                <span class="stat-added">+0</span>
                                <span class="stat-updated">~0</span>
                                <span class="stat-skipped">-0</span>
                            </div>
                        </div>
                        <div class="sync-stat-item">
                            <div class="stat-label">المسلسلات</div>
                            <div class="stat-values">
                                <span class="stat-added">+0</span>
                                <span class="stat-updated">~0</span>
                                <span class="stat-skipped">-0</span>
                            </div>
                        </div>
                        <div class="sync-stat-item">
                            <div class="stat-label">الأقسام</div>
                            <div class="stat-values">
                                <span class="stat-added">+0</span>
                                <span class="stat-updated">~0</span>
                                <span class="stat-skipped">-0</span>
                            </div>
                        </div>
                    </div>

                    <div class="sync-current-item">
                        <div class="current-item-label">العنصر الحالي:</div>
                        <div class="current-item-name">جاري التحضير...</div>
                    </div>

                    <div class="sync-detailed-progress">
                        <div class="detailed-stats">
                            <span class="processed-count">0</span> من <span class="total-count">0</span> عنصر
                        </div>
                        <div class="estimated-time">الوقت المتبقي: حساب...</div>
                    </div>
                </div>

                <div class="sync-progress-footer">
                    <div class="sync-legend">
                        <span class="legend-item"><span class="legend-color added"></span> مُضاف</span>
                        <span class="legend-item"><span class="legend-color updated"></span> مُحدث</span>
                        <span class="legend-item"><span class="legend-color skipped"></span> مُتجاهل</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(progressContainer);

    // إضافة حدث للزر إلغاء
    progressContainer.querySelector('.cancel-sync-btn').addEventListener('click', () => {
        if (window.syncCancelled === undefined) {
            window.syncCancelled = {};
        }
        window.syncCancelled[id] = true;
        showToast('تم إلغاء عملية المزامنة', 'warning');
    });

    return progressContainer;
}

// تحديث مؤشر التقدم للمزامنة
function updateSyncProgress(id, progressData, syncResults) {
    const container = document.getElementById(id);
    if (!container) return;

    const { phase, current, total, item, action } = progressData;

    // تحديث المرحلة الحالية
    const phaseTitle = container.querySelector('.phase-title');
    const phaseSubtitle = container.querySelector('.phase-subtitle');
    const phaseIcon = container.querySelector('.phase-icon');

    const phaseIcons = {
        movies: '🎬',
        series: '📺',
        categories: '📁',
        settings: '⚙️'
    };

    if (phaseTitle) phaseTitle.textContent = action || 'جاري المعالجة...';
    if (phaseSubtitle) phaseSubtitle.textContent = `${current} من ${total}`;
    if (phaseIcon) phaseIcon.textContent = phaseIcons[phase] || '📊';

    // تحديث شريط التقدم
    const progressFill = container.querySelector('.sync-progress-fill');
    const progressText = container.querySelector('.sync-progress-text');
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}%`;

    // تحديث العنصر الحالي
    const currentItemName = container.querySelector('.current-item-name');
    if (currentItemName) currentItemName.textContent = item || 'جاري المعالجة...';

    // تحديث الإحصائيات
    updateSyncStats(container, syncResults);

    // تحديث التقدم التفصيلي
    const processedCount = container.querySelector('.processed-count');
    const totalCount = container.querySelector('.total-count');

    if (processedCount) processedCount.textContent = syncResults.totalProcessed;
    if (totalCount) totalCount.textContent = syncResults.totalItems;
}

// تحديث إحصائيات المزامنة
function updateSyncStats(container, syncResults) {
    const statItems = container.querySelectorAll('.sync-stat-item');

    statItems.forEach((item, index) => {
        const statValues = item.querySelector('.stat-values');
        if (!statValues) return;

        let stats;
        switch (index) {
            case 0: // الأفلام
                stats = syncResults.movies;
                break;
            case 1: // المسلسلات
                stats = syncResults.series;
                break;
            case 2: // الأقسام
                stats = syncResults.categories;
                break;
            default:
                return;
        }

        const addedSpan = statValues.querySelector('.stat-added');
        const updatedSpan = statValues.querySelector('.stat-updated');
        const skippedSpan = statValues.querySelector('.stat-skipped');

        if (addedSpan) addedSpan.textContent = `+${stats.added}`;
        if (updatedSpan) updatedSpan.textContent = `~${stats.updated}`;
        if (skippedSpan) skippedSpan.textContent = `-${stats.skipped}`;
    });
}

// إزالة مؤشر التقدم للمزامنة
function removeSyncProgressIndicator(id) {
    const container = document.getElementById(id);
    if (container) {
        container.remove();
    }

    // تنظيف متغيرات الإلغاء
    if (window.syncCancelled && window.syncCancelled[id]) {
        delete window.syncCancelled[id];
    }
}

// إنشاء مؤشر التقدم المحسن (الوظيفة الأصلية)
function createProgressIndicator(id) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.id = id;

    progressContainer.innerHTML = `
        <div class="progress-header">
            <div class="progress-text">جاري الاستيراد...</div>
            <button class="cancel-import-btn">إلغاء</button>
        </div>
        <div class="progress-details">
            <span class="progress-percentage">0%</span>
            <span class="progress-stats">0/0</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-info">جاري تحليل الملفات...</div>
    `;

    document.body.appendChild(progressContainer);

    // إضافة حدث للزر إلغاء
    progressContainer.querySelector('.cancel-import-btn').addEventListener('click', () => {
        if (window.importCancelled === undefined) {
            window.importCancelled = {};
        }
        window.importCancelled[id] = true;
        updateProgressIndicator(id, 0, 1, "تم إلغاء الاستيراد");
        setTimeout(() => removeProgressIndicator(id), 1500);
    });
}

// تحديث مؤشر التقدم المحسن
function updateProgressIndicator(id, current, total, message, info) {
    const progressContainer = document.getElementById(id);
    if (progressContainer) {
        try {
            const percentage = Math.min(Math.floor((current / total) * 100), 100);

            // استخدام requestAnimationFrame لضمان تحديث واجهة المستخدم بشكل متزامن مع دورة رسم المتصفح
            requestAnimationFrame(() => {
                progressContainer.querySelector('.progress-text').textContent = message || `جاري المعالجة`;
                progressContainer.querySelector('.progress-percentage').textContent = `${percentage}%`;
                progressContainer.querySelector('.progress-stats').textContent = `${current}/${total}`;
                progressContainer.querySelector('.progress-fill').style.width = `${percentage}%`;

                if (info) {
                    progressContainer.querySelector('.progress-info').textContent = info;
                }
            });
        } catch (error) {
            console.error('خطأ في تحديث مؤشر التقدم:', error);
            // لا نريد أن نفشل في تحديث واجهة المستخدم بسبب خطأ في التحديث
        }
    }
}

// إزالة مؤشر التقدم
function removeProgressIndicator(id) {
    const progressContainer = document.getElementById(id);
    if (progressContainer) {
        // إضافة تأثير انتقالي قبل الإزالة
        progressContainer.classList.add('fade-out');
        setTimeout(() => {
            if (progressContainer.parentNode) {
                document.body.removeChild(progressContainer);
            }
        }, 300);
    }

    // إعادة تعيين متغير الإلغاء
    if (window.importCancelled && window.importCancelled[id]) {
        delete window.importCancelled[id];
    }
}

// حذف كل بيانات التطبيق
async function deleteAllAppData() {
    try {
        // إعادة تعيين حالة التطبيق
        appState.movies = [];
        appState.series = [];
        appState.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        appState.cachedImages = {};

        // حفظ الحالة الافتراضية
        await saveAppData();
        await localforage.clear(); // إضافة مسح كامل للمخزن المحلي

        // تحديث واجهة المستخدم
        updateCategoriesCounts();
        renderCategories();
        displayMovies('all'); // هنا نريد الانتقال للأعلى عند حذف جميع البيانات

        showToast('تم حذف جميع بيانات التطبيق بنجاح', 'success');

        // إغلاق مودال الإعدادات
        document.getElementById('settings-modal').classList.remove('show');
    } catch (error) {
        console.error('خطأ أثناء حذف بيانات التطبيق:', error);
        showToast('حدث خطأ أثناء حذف البيانات', 'error');
    }
}

// Searching in the app
function searchInApp(query) {
    // تحويل الاستعلام إلى أحرف صغيرة
    query = query.toLowerCase();

    // استبدال الألف بالهمزة بالألف العادية
    query = query.replace(/أ|إ|آ/g, 'ا');

    // البحث في الأفلام والمسلسلات
    const movieResults = appState.movies.filter(movie => {
        if (movie.hidden) return false;
        // تحويل اسم الفيلم إلى أحرف صغيرة واستبدال الألف بالهمزة بالألف العادية
        const normalizedName = movie.name.toLowerCase().replace(/أ|إ|آ/g, 'ا');
        return normalizedName.includes(query);
    });

    const seriesResults = appState.series.filter(series => {
        if (series.hidden) return false;
        // تحويل اسم المسلسل إلى أحرف صغيرة واستبدال الألف بالهمزة بالألف العادية
        const normalizedName = series.name.toLowerCase().replace(/أ|إ|آ/g, 'ا');
        return normalizedName.includes(query);
    });

    // دمج النتائج
    appState.searchResults = [...movieResults, ...seriesResults];

    // عرض النتائج
    displaySearchResults();
}

// Displaying search results
function displaySearchResults() {
    const resultsContainer = document.getElementById('search-results-container');
    const searchResultsPanel = document.getElementById('search-results');

    // Clearing the container
    resultsContainer.innerHTML = '';

    // Displaying a message if there are no results
    if (appState.searchResults.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">لا توجد نتائج للبحث</div>';
    } else {
        // Displaying results
        appState.searchResults.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';

            const imgFilename = getImageFilenameFromUrl(item.img);
            const imgSrc = appState.cachedImages[imgFilename] || item.img;

            const isFavorited = item.subCategories && item.subCategories.length > 0;

            resultItem.innerHTML = `
                <img src="${imgSrc}" alt="${item.name}" class="result-image" onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFFmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDg4LCAyMDIwLzA3LzEwLTIyOjA2OjUzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjIuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIzLTExLTIxVDE4OjU1OjM0KzAzOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMy0xMS0yMVQxODo1NjozNCswMzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMy0xMS0yMVQxODo1NjozNCswMzowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowZWJlOWYxYy1mYmUwLTk3NDAtYmZlZC1lZmU4NWQ5MGU2YjEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MGViZTlmMWMtZmJlMC05NzQwLWJmZWQtZWZlODVkOTBlNmIxIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6MGViZTlmMWMtZmJlMC05NzQwLWJmZWQtZWZlODVkOTBlNmIxIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDowZWJlOWYxYy1mYmUwLTk3NDAtYmZlZC1lZmU4NWQ5MGU2YjEiIHN0RXZ0OndoZW49IjIwMjMtMTEtMjFUMTg6NTU6MzQrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMi4wIChXaW5kb3dzKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7sXM3XAAAThElEQVR4nO3deXAUV34H8O/r7pFG94F0IAlJSEhgMGdjYoONbXx4DTa+4tjYju1kceBXVbLrPzZVqd1N1ZbLOVJV2U1VOaecjeONj/jCBzY+AAMxBmMw2AavDUhCAgkJ3dJoNJrR9Ky7f+yOPJKm5/UxI81of59/YM309LzRefX79X7vvdckhIBAMlw5U4EQvQu3v6wd4/X75sIYLojJjSGtJgAQUsMgzQUCWUyQzGYiXTbpxoKYDJiWNBebOZnpQXpdP6g6BlIdhlsZBz0/ClIdB70whjAwAJMAQIFgZdyQbA5IZb6Qy+sBgxxJLrGS3GJwpW3h9lYKVH2TZH87pXKqAuiBfoh4lkFgAWCsAWF2n4zS8ZUgS7dFqgMXCKNKIOYV1MKCBX9qM/2Hef/jPkz7EzG04c9k3V29jSzLI0IINJq1XGk7+Y3WFTEpEMZVP5sI7xvywnt3/WZ7l8RBQ/3+Tw0+tQYG1bJB7vA21H8QR/dPgxzM3w+E/5XBU7rNwlOEEPD5fAgEAqxj0rJv/eK/vv0L0Rt4O9lglENYqnQXPSYQxlGTnX3x2GvP+L2+mQBgNBphNBrj+9ZxwBgDQghjrRqndUdJ5zO/ZMi69YbonhxVUlxTLK60tfiX//5lj8c7C0A4iTNgP1I///KMH/wA4wXRnmyJKIglnPsefuRtj9c7E4iW5BTxbuvqo5+07fjN8D+9eS/I3vFXxjnFEUQge/7Vr10Yd8oLAArX/q/Qhp1j1wV/psDk7f6D+OAD80T3ZDJEFEQzrCwKzDqvzwdLdZObTxv/FXyFYRjQLPULLj75VxPds0lJZbWomQghjGlVrb15mz7t3P7OYMKvTX6RYWPZp2D4i4xsQvrC4Clo+jHIvqm1HBYxUYUXKhzJKZSUl1I3ORtTx8EZQ1CLa9W2h18Y723/sDzcFrzFvzBTQcRElkrpwwuMUWnHj78aWIZI3+GiuUqkpaTc/nHnP51YIpoTI04bR1JG2uM3Ii1cprRaSxYxlj2t/dEdU+PMkmJLY4pBcWrDnw9tu0v+9sbP5RcWrAx/YGYCGUMWz/kJ3nxlqPDLCscnb+8/lNRji2gSiTrqB5N9wk3lxw3H3nQP23sM0S/wG/AcXXUuq8Yw5M8q3V99ecnK8mIb96KAx+MBpRRM5vWQmZAZk8/hGXLCM9QBn88HWWYxC45zDXmvs9bNL+XEtQHJYLJ4Tt+O3XmlfpDLK7L91kGu27fAGUe6YfQgqtfbDZIERFwc9Xq94IzD6rzZuHz4PERFx3Xj3fdfHNnSXFBclEeW3XA+J9kx4sFhx1X4fb643zfZTPuBFzVtpQ+qjlwXdtMOEH+NzQHiiQFNQEjScvWdHaEO9Afc09kMuM77H/vQOi0Ljmd2tg+XzlkAxWqGYrVEfCi3e6BkWXgC/U6Qeip+yz3eCGwGrAWVYIGskLKiXGMYXTbS1nBHXM4/mU3bjFjBRdRGFc9hYw6TDSyc75FsRXAGBnQdQ/E5QQEwz8gIxJyKQTu1dYbfx6FaiqAo+jqb5hoGY4xihm5BqIqIOhvWQjGSfB4BYHpuCa7DmTAzAGPOdqZ6+oKOm7dOqmo7z6uJfAwG+G6WZ1SsMU9fYWcyiJpGJZRQUh84ZwPxNBuuKoXQ5WsYAZKkmBijjDErUaQaLrkuDtcHIHccZBDCQEQxVslKTVCSTYpAeMY45eLZlLOZcUE4XFMLpscwRLa/RK8jmmtOhWLJPRfJZinOiucgLLkEwQEQpwNQ1XGvZRWlTvIMiDgDgoawqgPjKyIzGm4fDfLDsWr35D3WVKwhhLQhzhtEnINzDogJfJF0JhBSCnCBDGMQJEiSNPBJVamNcw6O5BIEBzgbBWVpMB24EvFmSYQMIx0rF/0+rZTRQMCnQB7nFWOKSPIgLYQUTmcQJdNoNNoIId38lYNDUNJLEEKAqz5wrqLMVHQx0o2SCBnGVcfytEqjLRAIgDFe7w34q8AbEvTULxwCIh5AMuSs5OA3R7pREiFDBfQaxkwGA0wmE9wez7BAz3wPZJsnhjWIBNLBQJk5Yt+M6uo2zixQu5Zy5u9K3puPoxSTRNChz2KY0WgEZwxDw8MGrx9nWPvUc/qfYpJJBJJjUHvmDUXcW46nFJNEyPbfdRjm7e7udXg8nkw/7zWbDdIkiQIiJJQe0ULI+IlGPFhWURo4derMOxcuXtz55fnz/zvIhm2WbOnlRnSRdJNtuhWHcUGm75MPMNLkiGiZJN5STBIhDIBVr+F8fr+3qqrqB5s2bfpy3rx5V77+6h9e2rr1j9eOHDlSHgicVZMkCpFMk2USNyBHHJ04f6EGUPYCyEzZOCZRGgVJlkDQXlBkHDx4cGF+fv57DQ0NG1asWKFtb3xj3/79++taWlok1RdQOQdBIwuQeiGQCRFEMqyHZ/vu3edOnDjxcnl5+e76+vqe8FG3bt0yvfbaa/Vv//HtvV1dXa/5fL4l4QuxohJJWRCZOJYAGFVeWHXxxMmTr50+ffqV2traK3V1dUOrV68e2Lx582X42uLWgXDZqNfrra2trd22f//+J44dP77E4XA8MTE/inxm5nABoCCgBsBQlM/feWeeedb3Hn7ooYdOzJ8/35PIAWVZNlitVnHt2rWG48eP/x0hJEOSpODcIlm6bAmxRX7mTChxNY4xRhhjtKOzM/fYsWPfPX369K9qa2t7Ghoaro0sRTweT4HX650TXCQNP9XkiALJsCZWPFJMEjFxBjDIJpAfnDWwDOeOHcuorKzM6O3trdy1a1fl1q1bgw+YdXZ2Wmw2W20wHBEBiSQwzpFEWZaoqqpQVRVut7vE6/VWJenPvE+eIecbMplxpwk2Q2qFzZjCJ3DxWRyNuJBLZYn3egmVJIm7XC4wxtDe3l7icDjq4/YBM4jIh1i7BdUJrnGfKDHCvZ3DpQlMQCdCn3e0lJ0uGWMZU2OprKzMOzg4CLI5AJGMMmlCYOusMpQmXfNx5NJzSgcDHjnD6jFlQbTpXRWXZTnw+uuvV7rdbomfMYoMLMZqCPV5i93dXacXL168J08x2xOc8z5Pf/5MK8uQZTl/Yr/xzCMIITnJdXnxdwU8jHe3FW5vbVuaxZDuljkmZIFPCg+J9JRIlkmiT0glI7FspqeVqDY44jKJJ7CZUx1kkohPRdSR2oMBoyf1ZlR66KmWuF7DU2Jx7/4UY0tkk7wkkiXiNANKFXWmdwuE8+4nJIk3lhBaKSbYJB73SzE6Lto4kEyTbZIlGHDFddTa3taa8BO+UkyyRTJN0mTDI4u2GNfOmcFAxiLRB55qUU2iSZ5glP4gy/iXRnIFE5/DkzkYMEAqL81tEv2Ub9Eqnp6TKZgbxI8jGUaTAKLRNCMWTZwmpNSaRMMnUK54kmyp0SsVL02xQOxGdTgYSP7pQCJUKfUEI1UvDacCQU2yRU4yPZM8wcMTvA5i4iIiU0owiUi1SbxI/DmyyM4xB4MBBKL/fKsUk0pSbRJHckdiZz9O7DlixYJaMzpSbdIvfDyLj2T3eYLHEVd6YnNEptbBgEl8UvXSpHRB/GySbJIOw4DqidmRJlUv/hLIR0PxmcSj1oREqjXJlGizJRcNFqaYcJEmTSBzrLz3dRYf87qTQSofLkymSbdAHkh3n0pkoztZJnmC4bnG5b7AeWE+7hhsQWaiWpNnkidIXCSn2Xyn2e2T7ZlYiZCqM+XUFEv061ScqZ6s1VAdEzz9SpVrqliOeUFsRnX4K+N8+PVkeDbRe7N8UE/YQcRwZKgJLk5MsUQnRUSCWYxsNCNPCe/p2m7eGmg3Ked0zzYTYNIEIsn8/YFMnrqRRJOpEjEqfqKWC/xCYECKdXJNnkDK7L575g6y0dRziNxKCMCqovv8Rx7FkphgFJXZe8fK5XO/i+stKIk9RJSkn5rNhPIuD2g2STyOMplkKU4U62xDsU6mSVzEGhO8MXgB1mBWnADdIsMD1tJmoBKQ+n+tZFJQWBw02gONNRaOZxwrAZ1T9AQkEJlJPCECQYQoIHRzxR7Hu3YpbkwxnEGofEySAMHVCpEihQgkAaU2owuAiDsWBSB+CKODNgqIRLxzCr0QM6lYn4PEEZ+CnkZWQl4miBcixmVTBLklSYqGAiJO78LdSFWKAiLuPkUBkSXaD4Ak1lMUEHHRxobYC5uRwipFMIV4EpGaWIgFYkFFEAgNPzkCKcZXKoYnoO7bA6YeRCBjEK9GGcPJcW/bCxPjO+PL5AMCN4Lhiix2cR+IeD2KZRL3fZtxb9tzrkhHieGDtcRqUCwC4UiVRFKpvYWYIR5HFH22ot6OJdaL44VYcRPrRfFCrLiJBQ+xOOJ2vBThQWC80EZiX6JEiDEMEWMwwRQrF9iCCKZcgQM3FUmVIjWlSjhGsQWfWH8KBmKE3g+5TDwbEjOOJ4BHDqOIxUcSN68oDiaWQuIpFr9QGBPzCaKncE5I7P6CiKzQCBwn1n3ixpjiC4J6EXqZeC7U62BBsV4sEANixp/zJUAsoTXVjPOVCFOv+xQFRFxcJNLEkjg1MV6mHkQshaQn8TxiCZJKh6YYbUm8DylG/zHECkmxKG601aBUjhFH0RMWK0p6SrQYj05KnlIUEPFNe4Fi5ZB4dBFTLH2JX0QR9SADM43CcEIcQ+iDRLb5USxlIomcQ+i77wvE/1rCI9nQlHvxRPfK7lNUL+KpbMolokeMw4rTTi/c0YSOI/RAPY+I3U9+SZJiyiWiS4QcQo8YJwARG0vsOOJFCnGUvAGJWL/SOyS58jQFwN9BwlXX5D5nODuxPaZcOV0oPDX7ExX9rRxO1L1LnEHiJp7dXfS7Wk6EcR/2gA4/WvvGnTk3b1KeNIFTzqjT8+fRdcNQXxGE4B+K9bRRJFw7DWNaFicm/xRL/MRSLnGOeRxD5BghD6JiCpCiShHD94ZIi9Xxi7VTvdYk1g0iBJCDM9FFthAQK0ZCBCJrR4OIv4JUY++fiV8UEPFEUa2RiKWFeNkRO4JYbyH6RrFCRNu96U2smxMtJIIo9gARD6J3MBlDrL+M6OJ6xHv6Pp+IliWQGIdCJdoZCBFP8VYEzgc0nXFiTx2F3qQECRDJ1XEiXliP4fWoUi5E/4cCFUdNzZVU4wDuiHUAURrEJ0FQNLNvpfIEpYg03yY3TrF06oQkVSwFiXW2YiqHyDBifWWiRo2rD0/GdQlRnehxuoxYl0gUYgURWYTVTuJ8pY1oc0s0gXQ7QCyn6iFeJBZLbdEYhRQQ66kYo4jfDaSQQoRIIrRNPQVWA5IQ4t1fpJmfVIFMDPE+ThyEHEfGGFnHCOlXpATJNOLdXyQfhGzHtNYXE+1ZU2S8RPuImKMr0kEiDqIjiOiLiGEjcbMUcRAiLpO7TKRA2LE0iiX+F/FgJBZDpDGKP9HSp7UrMDnGk7KW7kcxYuguLt5/x7wkrLOLFEdbCfIpxmwUZ2JlRtyJpmCia+uqW0fiBoA0KiTq4iUm4o2iWbwsFHEQ3S4gdnCRnrEUxbFGXUX8CmNXiY4VrUbR7QLxQtdIRJNLBFFfJO7nFDtRzOsSwRiWxXHnmCMJnUjLv0VOJFIirCnGcBSxFmJNLOIHTOibETuRSPLpM8VKgghj6L55iIxDyEHEUpnoWOJzCpFjJHIQ0QOIvWn0DYbXL5JJIpXCU1SERPyB0Lnj2c5rg4oExKxxOEX/WVBcJtouJF61/IXEn+QdFIMoN6+1rccaiGZxTfVE4qYY1YxYVxB9UZwKIp4Eo7rEJMB44WCa1tC6eSBE6hMp5SSsRogExJrYp4i8a+QBJRpBrBdEBtFiYrQFQzF0Fy9AxBfEHEfMV9FSIgYxHj5OxAW0tBtRh1Bh0hP/qNnEQ7RWRc4Rj9cjRorpHFO0fBJ9idZbiJrq2YJoNbREE07T9x0rKmLJRPQ4sSyc8KJDJLmMGZbFwNpuK0mNURMXK0i0nmIpRLxoaP09YgixpjFe0I4aSeRMoknnSXWImCvEumyYGCTeV8SDXCGapPHoFovdnDGKJqRYBRk1hpZ4tQwr+iPRs8bheOK9Yjy2q9jZJGEDRD6O+BzC3Df2l9Tnp4rVnEQ6JdH6EeOYAolmvIBTbBJBvAWQeJHtMVJXFVAZxitG0WsYsb4xnpBLw4Uh2jxjVcZYXxJJcZq2ixVZG6JVLDVMumRBPIlFBNHmVKSYxDymWKWMRSJNKS0HESVSRROdjYjOtBS9QCCGFWRYxikgcfEYC0s04yVBJCmMJ9ZnxRIpRLStRULHgA5JH7M0aXkvoilZxBq/1hOJlTaR5jFexfAUQqxFkagRS75YRtBSlzB2/WptEBe7NqK/x3UG4b4w7rHG+z6dJFIxPMWSJRHJMHk/RSLJEbMNEiuB6MViHUSHI8QSTCvjHDaW9yMZQfR142VzHPpkpAtPphjjJd2koUNGR5poMWsVy59a4x5TrLJqoXVuiWS9OC41iDZ6NRBZtIwY3EuXE4gfQWvHiiTiMUIK5L7xRZIhWS+euBpEIopY04iUHuM1EZ0qSrxShyiJRRRnGo8V09gk69fiYi4sRZlixTOZ70YSK0aDGMdO5lvHoVPSxNMhYkknmkzjNd7QUiLJNC5NrJilE/F+Hl5O4reSWCWTuB1B7BhTrGeJOxMtJjyJRd+k1thS4eRj0rPjaJkYxUVsIkXsXKGGkRCpYFqK1L5Ep2uJTHZ1mnRXEj2RaFLq0DyS6nGxJ3lHXa5JxpjiUohOxFxbp4MnpXsRCRBPBNG5kpZnxPmqOBRSDxEMEGsL4+WKpiTU5fzx7JjGO67IBOg0J4pnQ0nGv8F4l2VCnzcuCRf3KZfI6/RoMmLJN6lfJZ1MuROJdMcUq1SRxDWh9CJ+klS4BKJiyfQnJlYUTWL5N5IYPn8ijx03cS1Wxjn4RDcXTZpUbSOxnhq1LItx22QUSyHiPXS8lJ3Qgqq4RJKy3p8MkwH0OYjWsixF+FPiR8QpRSXLRJj83+0UE5pIE1bnCcKUbTIj+VNmOWqGEhN7RkvMx5rkpuKnx0BvxLPQx3pcHCXrhKFT5pzI9ZK79w8wNaZ6kyZF8vwJpnIdIcXkJJYU/w9+9NbK91HafwAAAABJRU5ErkJggg=='">
                <div class="result-details">
                    <h3>${item.name}</h3>
                    <p>${getCategoryName(item.category)}</p>
                    <div class="result-actions">
                        <button class="play-result-btn" data-id="${item.id}">
                            <i class="fas fa-play"></i> تشغيل
                        </button>
                        <button class="favorite-result-btn ${isFavorited ? 'marked' : ''}" data-id="${item.id}">
                            <i class="fas fa-star"></i> تمييز
                        </button>
                    </div>
                </div>
            `;

            resultsContainer.appendChild(resultItem);
        });

        // Adding event listeners
        document.querySelectorAll('.play-result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.id;
                const item = findMovieById(itemId);
                if (item) {
                    openPlayModal(item);
                }
            });
        });

        document.querySelectorAll('.favorite-result-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.id;
                const item = findMovieById(itemId);
                if (item) {
                    openAddToSubcategoryModal(item);
                    btn.classList.add('marked');
                }
            });
        });
    }

    // Showing the results panel
    searchResultsPanel.classList.remove('hidden');

    // تحديث عنوان الصفحة
    const searchQuery = document.getElementById('search-input').value.trim();
    document.title = `البحث: ${searchQuery} (${appState.searchResults.length} نتيجة) - New Koktil-aflam v25`;
}

// فتح البحث الخارجي مع حلول بديلة
function openSearchInApp(url, title, searchEngine) {
    // إنشاء مودال تحذيري مع خيارات
    const modal = document.createElement('div');
    modal.className = 'modal show search-options-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content search-options-content';
    modalContent.style.cssText = `
        width: 90%;
        max-width: 600px;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;

    // شريط علوي
    const header = document.createElement('div');
    header.style.cssText = `
        background: ${searchEngine === 'google' ? 'linear-gradient(135deg, #4285f4, #34a853)' : 'linear-gradient(135deg, #ff0000, #cc0000)'};
        color: white;
        padding: 20px;
        text-align: center;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">
            <i class="fas ${searchEngine === 'google' ? 'fa-google' : 'fa-globe'}"></i> ${title}
        </h3>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
            اختر طريقة البحث المفضلة لديك
        </p>
    `;

    // محتوى الخيارات
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
        padding: 30px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    `;

    // خيار النافذة المنبثقة
    const popupOption = document.createElement('div');
    popupOption.className = 'search-option';
    popupOption.style.cssText = `
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    `;
    popupOption.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="background: #2196f3; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                <i class="fas fa-external-link-alt"></i>
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">فتح في نافذة منبثقة (مستحسن)</h4>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">
                    يفتح ${searchEngine === 'google' ? 'Google' : 'Yandex'} في نافذة منبثقة منفصلة مع إمكانية إضافة الأفلام بسهولة
                </p>
            </div>
            <div style="color: #4caf50; font-size: 24px;">
                <i class="fas fa-chevron-left"></i>
            </div>
        </div>
    `;

    // خيار التبويب الجديد
    const tabOption = document.createElement('div');
    tabOption.className = 'search-option';
    tabOption.style.cssText = `
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #fff3e0, #ffe0b2);
    `;
    tabOption.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="background: #ff9800; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                <i class="fas fa-window-maximize"></i>
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">فتح في تبويب جديد (تقليدي)</h4>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">
                    يفتح ${searchEngine === 'google' ? 'Google' : 'Yandex'} في تبويب جديد بالطريقة التقليدية
                </p>
            </div>
            <div style="color: #ff9800; font-size: 24px;">
                <i class="fas fa-chevron-left"></i>
            </div>
        </div>
    `;

    // خيار إضافة مباشرة
    const directAddOption = document.createElement('div');
    directAddOption.className = 'search-option';
    directAddOption.style.cssText = `
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
    `;
    directAddOption.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="background: #4caf50; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                <i class="fas fa-plus-circle"></i>
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">إضافة فيلم مباشرة</h4>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">
                    تخطي البحث وإضافة فيلم مباشرة إذا كان لديك الرابط
                </p>
            </div>
            <div style="color: #4caf50; font-size: 24px;">
                <i class="fas fa-chevron-left"></i>
            </div>
        </div>
    `;

    // خيار محرك البحث المخصص
    const customSearchOption = document.createElement('div');
    customSearchOption.className = 'search-option';
    customSearchOption.style.cssText = `
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #f3e5f5, #e1bee7);
    `;
    customSearchOption.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="background: #9c27b0; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                <i class="fas fa-globe-americas"></i>
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">البحث في مواقع الأفلام</h4>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">
                    ابحث في مواقع الأفلام المختلفة مثل السينما، شاهد، نتفليكس، يوتيوب
                </p>
            </div>
            <div style="color: #9c27b0; font-size: 24px;">
                <i class="fas fa-chevron-left"></i>
            </div>
        </div>
    `;

    optionsContainer.appendChild(popupOption);
    optionsContainer.appendChild(tabOption);
    optionsContainer.appendChild(customSearchOption);
    optionsContainer.appendChild(directAddOption);

    // زر الإغلاق
    const closeContainer = document.createElement('div');
    closeContainer.style.cssText = `
        padding: 20px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
        text-align: center;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> إغلاق';
    closeBtn.style.cssText = `
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
    `;

    closeContainer.appendChild(closeBtn);

    modalContent.appendChild(header);
    modalContent.appendChild(optionsContainer);
    modalContent.appendChild(closeContainer);
    modal.appendChild(modalContent);

    // تأثيرات hover للخيارات
    [popupOption, tabOption, customSearchOption, directAddOption].forEach(option => {
        option.addEventListener('mouseenter', () => {
            option.style.borderColor = '#2196f3';
            option.style.transform = 'translateY(-2px)';
            option.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.2)';
        });

        option.addEventListener('mouseleave', () => {
            option.style.borderColor = '#e0e0e0';
            option.style.transform = 'translateY(0)';
            option.style.boxShadow = 'none';
        });
    });

    // الأحداث
    popupOption.addEventListener('click', () => {
        document.body.removeChild(modal);
        openSearchInPopup(url, title, searchEngine);
    });

    tabOption.addEventListener('click', () => {
        document.body.removeChild(modal);
        window.open(url, '_blank');
    });

    customSearchOption.addEventListener('click', () => {
        document.body.removeChild(modal);
        const searchQuery = document.getElementById('search-input').value.trim();
        createCustomSearchEngine(searchQuery || 'فيلم', searchEngine);
    });

    directAddOption.addEventListener('click', () => {
        document.body.removeChild(modal);
        const searchQuery = document.getElementById('search-input').value.trim();
        openAddPageAsMovieModal('', searchQuery || 'فيلم جديد');
    });

    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // إغلاق عند الضغط على الخلفية
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // إضافة للصفحة
    document.body.appendChild(modal);
}

// فتح البحث في نافذة منبثقة مع تكامل محسن
function openSearchInPopup(url, title, searchEngine) {
    // فتح النافذة المنبثقة
    const popup = window.open(url, 'searchWindow',
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=yes,location=yes'
    );

    if (!popup) {
        showToast('تم حظر النافذة المنبثقة. سيتم فتح الرابط في تبويب جديد.', 'warning');
        // فتح في تبويب جديد كبديل
        window.open(url, '_blank');
        // إظهار نافذة إضافة فيلم مباشرة
        setTimeout(() => {
            const searchQuery = document.getElementById('search-input').value.trim();
            if (confirm('هل تريد إضافة فيلم مباشرة؟')) {
                openAddPageAsMovieModal(url, searchQuery || 'فيلم من البحث');
            }
        }, 1000);
        return;
    }

    // إنشاء شريط تحكم عائم
    const controlBar = document.createElement('div');
    controlBar.className = 'search-control-bar floating-control-bar';
    controlBar.id = 'floating-control-bar-' + Date.now();
    controlBar.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: ${searchEngine === 'google' ? 'linear-gradient(135deg, #4285f4, #34a853)' : 'linear-gradient(135deg, #ff0000, #cc0000)'} !important;
        color: white !important;
        padding: 15px 20px !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        gap: 15px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        min-width: 350px !important;
        max-width: 90vw !important;
        backdrop-filter: blur(10px) !important;
        border: 2px solid rgba(255,255,255,0.3) !important;
        animation: slideInFromTop 0.5s ease-out !important;
        pointer-events: auto !important;
        visibility: visible !important;
        opacity: 1 !important;
    `;

    controlBar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
            <i class="fas ${searchEngine === 'google' ? 'fa-google' : 'fa-globe'}"></i>
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 13px; font-weight: 600;">نافذة البحث مفتوحة</span>
                <span style="font-size: 11px; opacity: 0.8;">انتقل للصفحة المطلوبة ثم اضغط الأزرار</span>
            </div>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="copy-url-btn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.3s ease;" title="نسخ رابط الصفحة الحالية">
                <i class="fas fa-copy"></i> نسخ الرابط
            </button>
            <button class="add-from-popup-btn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.3s ease;">
                <i class="fas fa-plus"></i> إضافة فيلم
            </button>
            <button class="close-popup-btn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.3s ease;">
                <i class="fas fa-times"></i> إغلاق
            </button>
        </div>
    `;

    // إضافة الشريط للصفحة مع تأكيد الظهور
    document.body.appendChild(controlBar);

    // تأكيد إضافي لظهور الشريط
    setTimeout(() => {
        controlBar.style.display = 'flex';
        controlBar.style.visibility = 'visible';
        controlBar.style.opacity = '1';
        controlBar.style.zIndex = '999999';
        console.log('تم إنشاء الشريط العائم:', controlBar.id);
        console.log('موضع الشريط:', controlBar.getBoundingClientRect());
    }, 100);

    // إضافة الشريط لأعلى الصفحة أيضاً (كنسخة احتياطية)
    const topContainer = document.querySelector('body') || document.documentElement;
    if (topContainer && !topContainer.contains(controlBar)) {
        topContainer.appendChild(controlBar);
    }

    // الأحداث
    const copyBtn = controlBar.querySelector('.copy-url-btn');
    const addBtn = controlBar.querySelector('.add-from-popup-btn');
    const closeBtn = controlBar.querySelector('.close-popup-btn');

    // زر نسخ الرابط
    copyBtn.addEventListener('click', () => {
        console.log('تم الضغط على زر نسخ الرابط');
        try {
            const currentUrl = popup.location.href;
            console.log('الرابط المراد نسخه:', currentUrl);

            // نسخ الرابط للحافظة
            navigator.clipboard.writeText(currentUrl).then(() => {
                showToast('تم نسخ الرابط إلى الحافظة', 'success');
                console.log('تم نسخ الرابط بنجاح');
            }).catch(err => {
                console.error('خطأ في نسخ الرابط:', err);
                // طريقة بديلة للنسخ
                const textArea = document.createElement('textarea');
                textArea.value = currentUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showToast('تم نسخ الرابط إلى الحافظة', 'success');
            });
        } catch (error) {
            console.warn('لا يمكن الوصول لرابط النافذة:', error);
            showToast('لا يمكن نسخ الرابط. يرجى نسخه يدوياً من شريط العنوان.', 'warning');
        }
    });

    addBtn.addEventListener('click', () => {
        console.log('تم الضغط على زر إضافة فيلم');

        // محاولة الحصول على الرابط الحالي من النافذة المنبثقة
        let currentUrl = '';
        let pageTitle = '';

        try {
            // محاولة الوصول للرابط الحالي
            currentUrl = popup.location.href;
            pageTitle = popup.document.title;
            console.log('URL الحالي من النافذة:', currentUrl);
            console.log('عنوان الصفحة من النافذة:', pageTitle);
        } catch (error) {
            console.warn('لا يمكن الوصول لمحتوى النافذة بسبب CORS:', error);

            // طلب الرابط من المستخدم
            const userUrl = prompt('يرجى نسخ ولصق رابط الصفحة الحالية من النافذة المفتوحة:');
            if (userUrl && userUrl.trim()) {
                currentUrl = userUrl.trim();
                console.log('URL من المستخدم:', currentUrl);
            }

            // طلب العنوان من المستخدم
            const userTitle = prompt('يرجى إدخال عنوان الفيلم:');
            if (userTitle && userTitle.trim()) {
                pageTitle = userTitle.trim();
            } else {
                const searchQuery = document.getElementById('search-input').value.trim();
                pageTitle = searchQuery || 'فيلم من البحث';
            }
        }

        // إذا لم نحصل على رابط، استخدم رابط البحث الأصلي كبديل
        if (!currentUrl || currentUrl === url || currentUrl.includes('google.com/search') || currentUrl.includes('yandex.com/search')) {
            console.log('استخدام رابط البحث الأصلي كبديل');
            currentUrl = '';
        }

        openAddPageAsMovieModal(currentUrl, pageTitle);
    });

    closeBtn.addEventListener('click', () => {
        console.log('تم الضغط على زر الإغلاق');
        if (popup && !popup.closed) {
            popup.close();
        }
        if (document.body.contains(controlBar)) {
            document.body.removeChild(controlBar);
        }
    });

    // مراقبة إغلاق النافذة
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            if (document.body.contains(controlBar)) {
                document.body.removeChild(controlBar);
            }
        }
    }, 1000);

    // تأثيرات hover للأزرار
    [copyBtn, addBtn, closeBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(255,255,255,0.3)';
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(255,255,255,0.2)';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = 'none';
        });
    });

    // إظهار رسالة توضيحية
    showToast(`تم فتح ${searchEngine === 'google' ? 'Google' : 'Yandex'} في نافذة منبثقة. ابحث عن الشريط العائم في أعلى يمين الشاشة.`, 'success');

    // تأكيد قوي لظهور الشريط العائم
    forceShowFloatingBar(controlBar);

    // إضافة تلميح بصري للشريط العائم
    setTimeout(() => {
        if (controlBar && document.body.contains(controlBar)) {
            controlBar.style.animation = 'pulse 2s infinite';
            console.log('تم تطبيق تأثير النبضة على الشريط');
        }
    }, 2000);

    // إزالة التلميح بعد 10 ثوان
    setTimeout(() => {
        if (controlBar && document.body.contains(controlBar)) {
            controlBar.style.animation = 'none';
        }
    }, 10000);
}

// إجبار ظهور الشريط العائم
function forceShowFloatingBar(controlBar) {
    if (!controlBar) return;

    console.log('إجبار ظهور الشريط العائم...');

    // إزالة أي أنماط مخفية
    controlBar.style.removeProperty('display');
    controlBar.style.removeProperty('visibility');
    controlBar.style.removeProperty('opacity');

    // تطبيق الأنماط بقوة
    const forceStyles = {
        'position': 'fixed',
        'top': '20px',
        'right': '20px',
        'z-index': '2147483647',
        'display': 'flex',
        'visibility': 'visible',
        'opacity': '1',
        'pointer-events': 'auto',
        'transform': 'translateZ(0)',
        'will-change': 'transform'
    };

    Object.keys(forceStyles).forEach(property => {
        controlBar.style.setProperty(property, forceStyles[property], 'important');
    });

    // إضافة فئة CSS إضافية
    controlBar.classList.add('force-visible');

    // تأكيد الإضافة للصفحة
    if (!document.body.contains(controlBar)) {
        document.body.appendChild(controlBar);
    }

    // فحص دوري للتأكد من الظهور
    const checkInterval = setInterval(() => {
        if (!document.body.contains(controlBar)) {
            document.body.appendChild(controlBar);
        }

        const rect = controlBar.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            Object.keys(forceStyles).forEach(property => {
                controlBar.style.setProperty(property, forceStyles[property], 'important');
            });
        }
    }, 1000);

    // إيقاف الفحص بعد 30 ثانية
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 30000);

    console.log('تم تطبيق إعدادات الإظهار القسري للشريط');

    // إنشاء شريط بديل إذا لم يظهر الأول
    setTimeout(() => {
        const rect = controlBar.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || !isElementVisible(controlBar)) {
            console.warn('الشريط الأول غير مرئي، إنشاء شريط بديل...');
            createBackupFloatingBar(controlBar);
        }
    }, 3000);
}

// فحص رؤية العنصر
function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
    );
}

// إنشاء شريط عائم بديل
function createBackupFloatingBar(originalBar) {
    console.log('إنشاء شريط عائم بديل...');

    // إنشاء شريط بديل
    const backupBar = document.createElement('div');
    backupBar.className = 'backup-floating-bar force-visible';
    backupBar.id = 'backup-floating-bar-' + Date.now();

    // نسخ المحتوى من الشريط الأصلي
    backupBar.innerHTML = originalBar.innerHTML;

    // تطبيق أنماط قوية
    backupBar.style.cssText = `
        position: fixed !important;
        top: 70px !important;
        right: 20px !important;
        background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
        color: white !important;
        padding: 15px 20px !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 15px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        min-width: 350px !important;
        max-width: 90vw !important;
        backdrop-filter: blur(10px) !important;
        border: 2px solid rgba(255,255,255,0.3) !important;
        pointer-events: auto !important;
        visibility: visible !important;
        opacity: 1 !important;
        transform: translateZ(0) !important;
        animation: slideInFromTop 0.5s ease-out !important;
    `;

    // إضافة للصفحة
    document.body.appendChild(backupBar);

    // إضافة الأحداث للشريط البديل
    setupFloatingBarEvents(backupBar, originalBar);

    console.log('تم إنشاء الشريط البديل:', backupBar.id);
}

// إعداد أحداث الشريط العائم
function setupFloatingBarEvents(bar, originalBar) {
    const copyBtn = bar.querySelector('.copy-url-btn');
    const addBtn = bar.querySelector('.add-from-popup-btn');
    const closeBtn = bar.querySelector('.close-popup-btn');

    if (copyBtn && addBtn && closeBtn) {
        // نسخ الأحداث من الشريط الأصلي
        const originalCopyBtn = originalBar.querySelector('.copy-url-btn');
        const originalAddBtn = originalBar.querySelector('.add-from-popup-btn');
        const originalCloseBtn = originalBar.querySelector('.close-popup-btn');

        if (originalCopyBtn) {
            copyBtn.onclick = originalCopyBtn.onclick;
        }
        if (originalAddBtn) {
            addBtn.onclick = originalAddBtn.onclick;
        }
        if (originalCloseBtn) {
            closeBtn.onclick = function() {
                // إغلاق كلا الشريطين
                if (originalBar && document.body.contains(originalBar)) {
                    document.body.removeChild(originalBar);
                }
                if (bar && document.body.contains(bar)) {
                    document.body.removeChild(bar);
                }
            };
        }

        console.log('تم إعداد أحداث الشريط البديل');
    }
}

// إنشاء محرك بحث مخصص (حل بديل)
function createCustomSearchEngine(searchQuery, searchEngine) {
    // قائمة مواقع الأفلام الشائعة
    const movieSites = [
        { name: 'موقع السينما', url: 'https://www.elcinema.com/search?q=', icon: 'fas fa-film' },
        { name: 'موقع الأفلام', url: 'https://www.aflam.com/search?query=', icon: 'fas fa-video' },
        { name: 'موقع شاهد', url: 'https://shahid.mbc.net/ar/search?q=', icon: 'fas fa-play-circle' },
        { name: 'موقع نتفليكس', url: 'https://www.netflix.com/search?q=', icon: 'fab fa-netflix' },
        { name: 'يوتيوب', url: 'https://www.youtube.com/results?search_query=', icon: 'fab fa-youtube' },
        { name: 'IMDb', url: 'https://www.imdb.com/find?q=', icon: 'fab fa-imdb' }
    ];

    // إنشاء مودال محرك البحث المخصص
    const modal = document.createElement('div');
    modal.className = 'modal show custom-search-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content custom-search-content';
    modalContent.style.cssText = `
        width: 90%;
        max-width: 700px;
        max-height: 90%;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;

    // شريط علوي
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #6c5ce7, #a29bfe);
        color: white;
        padding: 20px;
        text-align: center;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">
            <i class="fas fa-search"></i> البحث في مواقع الأفلام
        </h3>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
            ابحث عن "${searchQuery}" في المواقع المختلفة
        </p>
    `;

    // محتوى المواقع
    const sitesContainer = document.createElement('div');
    sitesContainer.style.cssText = `
        padding: 25px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 15px;
        max-height: 400px;
        overflow-y: auto;
    `;

    movieSites.forEach(site => {
        const siteCard = document.createElement('div');
        siteCard.className = 'movie-site-card';
        siteCard.style.cssText = `
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        siteCard.innerHTML = `
            <div style="background: #6c5ce7; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                <i class="${site.icon}"></i>
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 5px 0; color: #333; font-size: 15px;">${site.name}</h4>
                <p style="margin: 0; color: #666; font-size: 12px;">البحث في ${site.name}</p>
            </div>
            <div style="color: #6c5ce7; font-size: 18px;">
                <i class="fas fa-chevron-left"></i>
            </div>
        `;

        // تأثيرات hover
        siteCard.addEventListener('mouseenter', () => {
            siteCard.style.borderColor = '#6c5ce7';
            siteCard.style.transform = 'translateY(-2px)';
            siteCard.style.boxShadow = '0 4px 12px rgba(108, 92, 231, 0.2)';
        });

        siteCard.addEventListener('mouseleave', () => {
            siteCard.style.borderColor = '#e0e0e0';
            siteCard.style.transform = 'translateY(0)';
            siteCard.style.boxShadow = 'none';
        });

        // حدث الضغط
        siteCard.addEventListener('click', () => {
            const searchUrl = site.url + encodeURIComponent(searchQuery);
            window.open(searchUrl, '_blank');
            document.body.removeChild(modal);
        });

        sitesContainer.appendChild(siteCard);
    });

    // زر الإغلاق
    const closeContainer = document.createElement('div');
    closeContainer.style.cssText = `
        padding: 20px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
        text-align: center;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> إغلاق';
    closeBtn.style.cssText = `
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
    `;

    closeContainer.appendChild(closeBtn);

    modalContent.appendChild(header);
    modalContent.appendChild(sitesContainer);
    modalContent.appendChild(closeContainer);
    modal.appendChild(modalContent);

    // الأحداث
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    document.body.appendChild(modal);
}

// فتح مودال إضافة الصفحة كفيلم
function openAddPageAsMovieModal(url, pageTitle) {
    console.log('فتح نموذج إضافة الفيلم:', { url, pageTitle });
    // إنشاء مودال إضافة الفيلم
    const modal = document.createElement('div');
    modal.className = 'modal show add-page-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content add-page-modal-content';
    modalContent.style.cssText = `
        width: 90%;
        max-width: 600px;
        max-height: 90%;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;

    // شريط علوي
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: white;
        padding: 20px;
        text-align: center;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">
            <i class="fas fa-plus-circle"></i> إضافة صفحة كفيلم
        </h3>
    `;

    // محتوى النموذج
    const formContainer = document.createElement('div');
    formContainer.style.cssText = `
        padding: 25px;
        overflow-y: auto;
        flex: 1;
    `;

    // الحصول على كلمات البحث من حقل البحث
    const searchQuery = document.getElementById('search-input').value.trim();
    console.log('🔍 كلمات البحث الحالية:', searchQuery);

    // تنظيف عنوان الصفحة
    let cleanTitle = '';
    if (pageTitle && pageTitle.trim()) {
        cleanTitle = pageTitle.replace(/- Google Search|- Yandex|Search|بحث|Google|Yandex|مشاهدة فيلم/gi, '').trim();
        console.log('📄 عنوان الصفحة بعد التنظيف:', cleanTitle);
    }

    // منطق ذكي لاختيار أفضل اسم
    let finalTitle = '';

    if (searchQuery && searchQuery.length > 2) {
        // إعطاء الأولوية لكلمات البحث
        finalTitle = searchQuery;
        console.log('✅ استخدام كلمات البحث كعنوان رئيسي');
    } else if (cleanTitle && cleanTitle.length > 2) {
        // استخدام عنوان الصفحة المنظف
        finalTitle = cleanTitle;
        console.log('✅ استخدام عنوان الصفحة المنظف');
    } else {
        // قيمة افتراضية
        finalTitle = 'فيلم جديد';
        console.log('⚠️ استخدام العنوان الافتراضي');
    }

    console.log('🎬 العنوان النهائي للفيلم:', finalTitle);

    // تنظيف URL - قبول الرابط إذا كان صالحاً وليس رابط بحث
    let cleanUrl = '';
    if (url && url.trim()) {
        const trimmedUrl = url.trim();
        // قبول الرابط إذا لم يكن رابط بحث
        if (!trimmedUrl.includes('google.com/search') &&
            !trimmedUrl.includes('yandex.com/search') &&
            !trimmedUrl.includes('search?') &&
            trimmedUrl.startsWith('http')) {
            cleanUrl = trimmedUrl;
        }
    }

    console.log('البيانات المنظفة:', { cleanTitle, cleanUrl, originalUrl: url });

    formContainer.innerHTML = `
        <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                اسم الفيلم:
                <button type="button" id="use-search-query-btn" style="background: #4caf50; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 10px; cursor: pointer;" title="استخدام كلمات البحث">
                    <i class="fas fa-search"></i> من البحث
                </button>
            </label>
            <input type="text" id="page-movie-name" value="${finalTitle}" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.3s;" placeholder="أدخل اسم الفيلم أو استخدم زر 'من البحث'">
            <small style="color: #666; font-size: 12px; margin-top: 5px; display: block;">
                <i class="fas fa-info-circle"></i> كلمات البحث الحالية: "${searchQuery || 'لا يوجد'}"
            </small>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                رابط الفيلم:
                <button type="button" id="paste-url-btn" style="background: #2196f3; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 10px; cursor: pointer;" title="لصق الرابط من الحافظة">
                    <i class="fas fa-paste"></i> لصق
                </button>
            </label>
            <input type="url" id="page-movie-url" value="${cleanUrl}" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.3s;" placeholder="أدخل رابط الفيلم أو استخدم زر 'نسخ الرابط' من الشريط العائم">
            ${!cleanUrl ? '<small style="color: #666; font-size: 12px; margin-top: 5px; display: block;"><i class="fas fa-info-circle"></i> نصيحة: استخدم زر "نسخ الرابط" من الشريط العائم ثم "لصق" هنا</small>' : '<small style="color: #4caf50; font-size: 12px; margin-top: 5px; display: block;"><i class="fas fa-check-circle"></i> تم تعبئة الرابط تلقائياً</small>'}
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">رابط الصورة (اختياري):</label>
            <input type="url" id="page-movie-image" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.3s;" placeholder="أدخل رابط صورة الفيلم">
        </div>

        <div class="form-group" style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                القسم:
                <small style="font-weight: 400; color: #666; margin-right: 10px;">(جميع أقسام التطبيق)</small>
                <button type="button" id="reload-categories-btn" style="background: #ff9800; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 10px; cursor: pointer;" title="إعادة تحميل الأقسام">
                    <i class="fas fa-sync-alt"></i> إعادة تحميل
                </button>
            </label>
            <select id="page-movie-category" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white;">
                <option value="">جاري تحميل الأقسام...</option>
            </select>
            <small id="categories-status" style="color: #666; font-size: 12px; margin-top: 5px; display: block;">
                <i class="fas fa-spinner fa-spin"></i> جاري تحميل الأقسام...
            </small>
        </div>
    `;

    // أزرار التحكم
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        padding: 20px 25px;
        background: #f8f9fa;
        display: flex;
        gap: 15px;
        justify-content: center;
        border-top: 1px solid #e0e0e0;
    `;

    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الفيلم';
    saveBtn.style.cssText = `
        background: linear-gradient(135deg, #4caf50, #45a049);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> إلغاء';
    cancelBtn.style.cssText = `
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    buttonsContainer.appendChild(saveBtn);
    buttonsContainer.appendChild(cancelBtn);

    modalContent.appendChild(header);
    modalContent.appendChild(formContainer);
    modalContent.appendChild(buttonsContainer);
    modal.appendChild(modalContent);

    // تحديث جميع الأقسام في المودال مع تأخير لضمان تحميل البيانات
    setTimeout(() => {
        updateCategoriesInModal();
    }, 100);

    // الأحداث
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // تأثيرات hover
    [saveBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = 'none';
        });
    });

    // حدث الحفظ
    saveBtn.addEventListener('click', () => {
        savePageAsMovie(modal);
    });

    // إغلاق عند الضغط على الخلفية
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    // إضافة للصفحة
    document.body.appendChild(modal);

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        createModalScrollbar(modalContent);
        console.log('✅ تم إضافة شريط التمرير لنافذة إضافة الفيلم');
    }, 200);

    // إضافة حدث زر "من البحث"
    const useSearchBtn = document.getElementById('use-search-query-btn');
    if (useSearchBtn) {
        useSearchBtn.addEventListener('click', () => {
            const searchQuery = document.getElementById('search-input').value.trim();
            if (searchQuery) {
                document.getElementById('page-movie-name').value = searchQuery;
                showToast('تم استخدام كلمات البحث كاسم للفيلم', 'success');
            } else {
                showToast('لا توجد كلمات بحث لاستخدامها', 'warning');
            }
        });
    }

    // إضافة حدث زر إعادة تحميل الأقسام
    const reloadCategoriesBtn = document.getElementById('reload-categories-btn');
    if (reloadCategoriesBtn) {
        reloadCategoriesBtn.addEventListener('click', () => {
            console.log('🔄 إعادة تحميل الأقسام بناءً على طلب المستخدم');
            const statusElement = document.getElementById('categories-status');
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إعادة التحميل...';
            }

            // إعادة تحميل الأقسام
            setTimeout(() => {
                updateCategoriesInModal();
            }, 500);
        });
    }

    // إضافة حدث زر اللصق
    const pasteBtn = document.getElementById('paste-url-btn');
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.startsWith('http')) {
                    document.getElementById('page-movie-url').value = text;
                    showToast('تم لصق الرابط بنجاح', 'success');
                } else {
                    showToast('لا يوجد رابط صالح في الحافظة', 'warning');
                }
            } catch (err) {
                console.error('خطأ في قراءة الحافظة:', err);
                showToast('لا يمكن قراءة الحافظة. يرجى اللصق يدوياً (Ctrl+V)', 'warning');
            }
        });
    }

    // لا حاجة لحدث تغيير القسم لأننا نستخدم قائمة واحدة شاملة

    // التركيز على حقل الاسم
    setTimeout(() => {
        document.getElementById('page-movie-name').focus();
    }, 100);
}

// تحديث جميع الأقسام في المودال
function updateCategoriesInModal() {
    console.log('=== بدء تحديث أقسام المودال ===');

    const categorySelect = document.getElementById('page-movie-category');
    if (!categorySelect) {
        console.error('❌ لم يتم العثور على عنصر اختيار القسم');
        showToast('خطأ: لم يتم العثور على قائمة الأقسام', 'error');
        return;
    }

    console.log('✅ تم العثور على عنصر اختيار القسم');

    // مسح الخيارات الحالية
    categorySelect.innerHTML = '';

    console.log('📊 بيانات الأقسام الحالية:', appState.categories);

    // التأكد من وجود البيانات
    if (!appState || !appState.categories) {
        console.error('❌ بيانات الأقسام غير موجودة في appState');
        showToast('خطأ: بيانات الأقسام غير متاحة', 'error');

        // إضافة أقسام افتراضية فورية
        addDefaultCategoriesToModal(categorySelect);
        return;
    }

    // إضافة خيار افتراضي
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'اختر القسم...';
    categorySelect.appendChild(defaultOption);

    let totalOptions = 1; // العد يبدأ من 1 للخيار الافتراضي

    // إضافة الأقسام الرئيسية العامة
    if (appState.categories.main && appState.categories.main.length > 0) {
        appState.categories.main.forEach(mainCat => {
            if (!mainCat.hidden) {
                const option = document.createElement('option');
                option.value = mainCat.id;
                option.textContent = `📁 ${mainCat.name}`;
                option.setAttribute('data-type', 'main');
                categorySelect.appendChild(option);
                totalOptions++;
                console.log('أضيف قسم رئيسي عام:', mainCat.name);
            }
        });
    } else {
        console.warn('لا توجد أقسام رئيسية عامة');
    }

    // إضافة الأقسام الرئيسية الخاصة
    if (appState.categories.special && appState.categories.special.length > 0) {
        appState.categories.special.forEach(specialCat => {
            if (!specialCat.hidden) {
                const option = document.createElement('option');
                option.value = specialCat.id;
                option.textContent = `🔒 ${specialCat.name} (خاص)`;
                option.setAttribute('data-type', 'special');
                categorySelect.appendChild(option);
                totalOptions++;
                console.log('أضيف قسم خاص:', specialCat.name);
            }
        });
    } else {
        console.warn('لا توجد أقسام خاصة');
    }

    // إضافة الأقسام الفرعية العامة
    if (appState.categories.sub && appState.categories.sub.length > 0) {
        appState.categories.sub.forEach(subCat => {
            if (!subCat.hidden) {
                const option = document.createElement('option');
                option.value = subCat.id;
                option.textContent = `📂 ${subCat.name} (فرعي)`;
                option.setAttribute('data-type', 'sub');
                categorySelect.appendChild(option);
                totalOptions++;
                console.log('أضيف قسم فرعي عام:', subCat.name);
            }
        });
    } else {
        console.warn('لا توجد أقسام فرعية عامة');
    }

    // إضافة الأقسام الفرعية الخاصة
    if (appState.categories.specialSub && appState.categories.specialSub.length > 0) {
        appState.categories.specialSub.forEach(specialSubCat => {
            if (!specialSubCat.hidden) {
                const option = document.createElement('option');
                option.value = specialSubCat.id;
                option.textContent = `🔐 ${specialSubCat.name} (فرعي خاص)`;
                option.setAttribute('data-type', 'specialSub');
                categorySelect.appendChild(option);
                totalOptions++;
                console.log('أضيف قسم فرعي خاص:', specialSubCat.name);
            }
        });
    } else {
        console.warn('لا توجد أقسام فرعية خاصة');
    }

    console.log(`📊 تم تحديث الأقسام. إجمالي الخيارات: ${totalOptions}`);

    // تحديث رسالة الحالة
    const statusElement = document.getElementById('categories-status');

    // إذا لم تتم إضافة أي أقسام، أضف أقسام افتراضية
    if (totalOptions === 1) {
        console.warn('⚠️ لم يتم العثور على أقسام، إضافة أقسام افتراضية...');
        if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> لم يتم العثور على أقسام، جاري إضافة أقسام افتراضية...';
        }
        addDefaultCategoriesToModal(categorySelect);
    } else {
        console.log('✅ تم تحميل الأقسام بنجاح');
        if (statusElement) {
            statusElement.innerHTML = `<i class="fas fa-check-circle" style="color: #4caf50;"></i> تم تحميل ${totalOptions - 1} قسم بنجاح`;
        }
        showToast(`تم تحميل ${totalOptions - 1} قسم`, 'success');
    }
}

// إضافة أقسام افتراضية للمودال
function addDefaultCategoriesToModal(categorySelect) {
    console.log('🔧 إضافة أقسام افتراضية...');

    const defaultCategories = [
        { id: 'all', name: 'جميع الأفلام والمسلسلات', type: 'main' },
        { id: 'arabic-old', name: 'أفلام عربية قديمة', type: 'main' },
        { id: 'arabic-new', name: 'أفلام عربية جديدة', type: 'main' },
        { id: 'series', name: 'المسلسلات', type: 'main' },
        { id: 'foreign1', name: 'أفلام أجنبية 1', type: 'main' },
        { id: 'foreign2', name: 'أفلام أجنبية 2', type: 'main' },
        { id: 'foreign3', name: 'أفلام أجنبية 3', type: 'main' },
        { id: 'horror', name: 'أفلام الرعب', type: 'main' },
        { id: 'movie-series', name: 'سلاسل الأفلام', type: 'main' },
        { id: 'stars', name: 'أفلام النجوم', type: 'main' },
        { id: 'family', name: 'أفلام عائلية', type: 'main' }
    ];

    let addedCount = 0;
    defaultCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `📁 ${cat.name}`;
        option.setAttribute('data-type', cat.type);
        categorySelect.appendChild(option);
        addedCount++;
        console.log(`➕ أضيف قسم افتراضي: ${cat.name}`);
    });

    console.log(`✅ تم إضافة ${addedCount} قسم افتراضي`);

    // تحديث رسالة الحالة
    const statusElement = document.getElementById('categories-status');
    if (statusElement) {
        statusElement.innerHTML = `<i class="fas fa-check-circle" style="color: #ff9800;"></i> تم تحميل ${addedCount} قسم افتراضي`;
    }

    showToast(`تم تحميل ${addedCount} قسم افتراضي`, 'info');
}

// وظيفة محذوفة - لم تعد مطلوبة لأننا نستخدم قائمة واحدة شاملة

// حفظ الصفحة كفيلم
function savePageAsMovie(modal) {
    const name = document.getElementById('page-movie-name').value.trim();
    const url = document.getElementById('page-movie-url').value.trim();
    const image = document.getElementById('page-movie-image').value.trim();
    const selectedCategory = document.getElementById('page-movie-category').value;

    console.log('بيانات الحفظ:', { name, url, image, selectedCategory });

    // التحقق من البيانات المطلوبة
    if (!name) {
        showToast('يجب إدخال اسم الفيلم', 'error');
        document.getElementById('page-movie-name').focus();
        return;
    }

    if (!selectedCategory) {
        showToast('يجب اختيار قسم للفيلم', 'error');
        document.getElementById('page-movie-category').focus();
        return;
    }

    if (!url) {
        showToast('يجب إدخال رابط الفيلم', 'error');
        document.getElementById('page-movie-url').focus();
        return;
    }

    // التحقق من صحة الرابط
    try {
        new URL(url);
    } catch (e) {
        showToast('رابط الفيلم غير صحيح', 'error');
        document.getElementById('page-movie-url').focus();
        return;
    }

    // التحقق من عدم وجود فيلم بنفس الاسم أو الرابط
    const existingMovie = appState.movies.find(movie =>
        movie.name.toLowerCase() === name.toLowerCase() ||
        movie.href === url
    );

    if (existingMovie) {
        if (!confirm(`يوجد فيلم بنفس الاسم أو الرابط: "${existingMovie.name}"\nهل تريد المتابعة؟`)) {
            return;
        }
    }

    // تحديد نوع القسم المختار
    const categoryOption = document.querySelector(`#page-movie-category option[value="${selectedCategory}"]`);
    const categoryType = categoryOption ? categoryOption.getAttribute('data-type') : 'main';

    console.log('تحليل القسم المختار:', {
        selectedCategory,
        categoryType,
        categoryName: categoryOption ? categoryOption.textContent : 'غير معروف'
    });

    // تحديد القسم الرئيسي والفرعي حسب النوع
    let mainCategory = selectedCategory;
    let subCategories = [];
    let specialSubCategories = [];

    if (categoryType === 'sub') {
        // إذا كان القسم المختار فرعي عام، ابحث عن القسم الرئيسي المناسب
        const subCatData = appState.categories.sub.find(sub => sub.id === selectedCategory);
        if (subCatData) {
            // البحث عن القسم الرئيسي الذي يحتوي على هذا القسم الفرعي
            const parentMain = appState.categories.main.find(main =>
                main.subCategories && main.subCategories.includes(selectedCategory)
            );
            if (parentMain) {
                mainCategory = parentMain.id;
                subCategories = [selectedCategory];
            } else {
                // إذا لم نجد قسم رئيسي، استخدم "all" كافتراضي
                mainCategory = 'all';
                subCategories = [selectedCategory];
            }
        }
    } else if (categoryType === 'specialSub') {
        // إذا كان القسم المختار فرعي خاص
        const specialSubCatData = appState.categories.specialSub.find(sub => sub.id === selectedCategory);
        if (specialSubCatData) {
            // البحث عن القسم الرئيسي الخاص المناسب
            const parentSpecial = appState.categories.special.find(main =>
                main.subCategories && main.subCategories.includes(selectedCategory)
            );
            if (parentSpecial) {
                mainCategory = parentSpecial.id;
                specialSubCategories = [selectedCategory];
            } else {
                // استخدام القسم كرئيسي إذا لم نجد والد
                mainCategory = selectedCategory;
            }
        }
    } else if (categoryType === 'special') {
        // إذا كان القسم المختار خاص رئيسي
        mainCategory = selectedCategory;
    }

    // إنشاء كائن الفيلم الجديد
    const newMovie = {
        id: 'movie-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: name,
        href: url,
        img: image || 'https://via.placeholder.com/300x450/2196f3/white?text=' + encodeURIComponent(name),
        category: mainCategory,
        subCategories: subCategories,
        specialSubCategories: specialSubCategories,
        addedDate: new Date().toISOString(),
        hidden: false,
        star: '', // إزالة التقييم
        site: getSiteFromUrl(url) || 'موقع خارجي'
    };

    console.log('كائن الفيلم الجديد:', newMovie);

    // إضافة الفيلم للتطبيق
    appState.movies.push(newMovie);

    // حفظ البيانات
    saveAppData();

    // تحديث العدادات
    updateCategoriesCounts();

    // تحديث العرض إذا كان المستخدم في نفس القسم
    if (appState.currentCategory === mainCategory ||
        appState.currentCategory === selectedCategory ||
        (subCategories.length > 0 && subCategories.includes(appState.currentCategory)) ||
        (specialSubCategories.length > 0 && specialSubCategories.includes(appState.currentCategory))) {
        displayMovies(appState.currentCategory, 1);
    }

    // إغلاق المودال
    document.body.removeChild(modal);

    // عرض رسالة نجاح
    showToast(`تم إضافة الفيلم "${name}" بنجاح`, 'success');

    // تحديث عنوان الصفحة
    document.title = `تم إضافة: ${name} - New Koktil-aflam v27`;
    setTimeout(() => {
        document.title = 'New Koktil-aflam v27';
    }, 3000);
}

// إنشاء شريط تمرير واضح وسهل للمودالات
function createModalScrollbar(modalContent) {
    // التحقق من وجود شريط تمرير بالفعل
    if (modalContent.querySelector('.modal-scrollbar')) {
        return;
    }

    console.log('📜 إنشاء شريط تمرير واضح وسهل');

    // إنشاء الشريط الجانبي
    const scrollbar = document.createElement('div');
    scrollbar.className = 'modal-scrollbar';
    scrollbar.title = 'شريط التمرير - اسحب أو انقر للتنقل';

    // إنشاء المقبض
    const handle = document.createElement('div');
    handle.className = 'modal-scroll-handle';
    handle.title = 'اسحب هذا المقبض للتمرير';

    scrollbar.appendChild(handle);
    modalContent.appendChild(scrollbar);

    // إجبار الإظهار فوراً
    scrollbar.style.display = 'block';
    scrollbar.style.visibility = 'visible';
    scrollbar.style.opacity = '1';
    handle.style.display = 'block';
    handle.style.visibility = 'visible';
    handle.style.opacity = '1';

    // إعداد الأحداث
    setupEasyScrollbar(modalContent, scrollbar, handle);

    console.log('✅ تم إنشاء وإظهار شريط التمرير فوراً');
}

// إضافة شريط التمرير تلقائياً لجميع المودالات الجديدة
function addScrollbarToAllModals() {
    console.log('🔄 فحص جميع المودالات لإضافة شريط التمرير...');

    // قائمة بجميع المودالات في التطبيق
    const modalIds = [
        'settings-modal',
        'edit-movie-modal',
        'add-to-subcategory-modal',
        'play-movie-modal',
        'clean-names-modal',
        'confirm-modal'
    ];

    modalIds.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent && !modalContent.querySelector('.modal-scrollbar')) {
                createModalScrollbar(modalContent);
                console.log(`✅ تم إضافة شريط التمرير للمودال: ${modalId}`);
            }
        }
    });

    console.log('🎯 تم فحص جميع المودالات');
}

// مراقب لإضافة شريط التمرير للمودالات الجديدة تلقائياً
function observeNewModals() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // إذا كان العنصر المضاف مودال
                    if (node.classList && node.classList.contains('modal')) {
                        const modalContent = node.querySelector('.modal-content');
                        if (modalContent && !modalContent.querySelector('.modal-scrollbar')) {
                            setTimeout(() => {
                                createModalScrollbar(modalContent);
                                console.log('✅ تم إضافة شريط التمرير للمودال الجديد تلقائياً');

                                // إجبار إظهار فوري
                                setTimeout(() => {
                                    forceShowAllScrollbars();
                                }, 50);
                            }, 100);
                        }
                    }

                    // إذا كان العنصر يحتوي على مودالات
                    const modals = node.querySelectorAll && node.querySelectorAll('.modal .modal-content');
                    if (modals && modals.length > 0) {
                        modals.forEach(modalContent => {
                            if (!modalContent.querySelector('.modal-scrollbar')) {
                                setTimeout(() => {
                                    createModalScrollbar(modalContent);
                                    console.log('✅ تم إضافة شريط التمرير للمودال المتداخل تلقائياً');
                                }, 100);
                            }
                        });
                    }
                }
            });
        });
    });

    // بدء مراقبة التغييرات في DOM
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('👁️ تم تفعيل مراقب المودالات الجديدة');
}

// إجبار إظهار جميع أشرطة التمرير بقوة
function forceShowAllScrollbars() {
    console.log('💪 إجبار إظهار جميع أشرطة التمرير...');

    const allScrollbars = document.querySelectorAll('.modal-scrollbar');
    const allHandles = document.querySelectorAll('.modal-scroll-handle');

    console.log(`🔍 تم العثور على ${allScrollbars.length} شريط تمرير`);

    allScrollbars.forEach((scrollbar, index) => {
        scrollbar.style.display = 'block';
        scrollbar.style.visibility = 'visible';
        scrollbar.style.opacity = '1';
        scrollbar.style.zIndex = '1001';
        scrollbar.style.position = 'absolute';
        scrollbar.style.right = '0';
        scrollbar.style.top = '0';
        scrollbar.style.width = '18px';
        scrollbar.style.height = '100%';
        scrollbar.style.background = '#f0f0f0';

        console.log(`✅ تم إجبار إظهار الشريط ${index + 1}`);
    });

    allHandles.forEach((handle, index) => {
        handle.style.display = 'block';
        handle.style.visibility = 'visible';
        handle.style.opacity = '1';
        handle.style.background = '#2196f3';
        handle.style.width = '12px';
        handle.style.height = '60px';
        handle.style.left = '3px';
        handle.style.top = '10px';
        handle.style.borderRadius = '6px';

        console.log(`✅ تم إجبار إظهار المقبض ${index + 1}`);
    });

    console.log('💪 انتهى إجبار الإظهار');
}

// إضافة التحكم بالكيبورد لصفحات الإعدادات
function setupSettingsKeyboardControls() {
    console.log('⌨️ إعداد التحكم بالكيبورد للإعدادات...');

    // إزالة أي مستمع سابق لتجنب التكرار
    document.removeEventListener('keydown', handleSettingsKeyboard);

    // إضافة مستمع جديد
    document.addEventListener('keydown', handleSettingsKeyboard);

    console.log('✅ تم تفعيل التحكم بالكيبورد للإعدادات');
}

// معالج أحداث الكيبورد للإعدادات
function handleSettingsKeyboard(event) {
    // التحقق من أن نافذة الإعدادات مفتوحة
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal || !settingsModal.classList.contains('show')) {
        return; // لا تفعل شيء إذا لم تكن الإعدادات مفتوحة
    }

    // التحقق من أن المحتوى مرئي (وليس شاشة كلمة المرور)
    const settingsContent = document.getElementById('settings-content');
    if (!settingsContent || settingsContent.classList.contains('hidden')) {
        return; // لا تفعل شيء إذا كان المحتوى مخفي
    }

    const modalContent = settingsModal.querySelector('.modal-content');
    if (!modalContent) return;

    // منع التمرير الافتراضي للصفحة
    const shouldPreventDefault = [
        'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown',
        'Home', 'End', 'Space'
    ].includes(event.key);

    if (shouldPreventDefault) {
        event.preventDefault();
        event.stopPropagation();
    }

    // تحديد مقدار التمرير
    let scrollAmount = 0;
    const smallScroll = 40;  // للأسهم
    const mediumScroll = 100; // للمسافة
    const largeScroll = modalContent.clientHeight * 0.8; // للصفحات

    switch(event.key) {
        case 'ArrowUp':
            scrollAmount = -smallScroll;
            console.log('⬆️ سهم لأعلى - تمرير صغير');
            break;

        case 'ArrowDown':
            scrollAmount = smallScroll;
            console.log('⬇️ سهم لأسفل - تمرير صغير');
            break;

        case 'PageUp':
            scrollAmount = -largeScroll;
            console.log('📄⬆️ Page Up - تمرير كبير لأعلى');
            break;

        case 'PageDown':
            scrollAmount = largeScroll;
            console.log('📄⬇️ Page Down - تمرير كبير لأسفل');
            break;

        case 'Home':
            if (event.ctrlKey) {
                modalContent.scrollTop = 0;
                console.log('🏠 Ctrl+Home - الانتقال للأعلى');
                return;
            }
            break;

        case 'End':
            if (event.ctrlKey) {
                modalContent.scrollTop = modalContent.scrollHeight;
                console.log('🔚 Ctrl+End - الانتقال للأسفل');
                return;
            }
            break;

        case ' ': // مفتاح المسافة
        case 'Space':
            scrollAmount = event.shiftKey ? -mediumScroll : mediumScroll;
            console.log(event.shiftKey ? '⬆️ Shift+Space - تمرير متوسط لأعلى' : '⬇️ Space - تمرير متوسط لأسفل');
            break;

        default:
            return; // لا تفعل شيء للمفاتيح الأخرى
    }

    // تطبيق التمرير
    if (scrollAmount !== 0) {
        const currentScroll = modalContent.scrollTop;
        const newScroll = currentScroll + scrollAmount;
        const maxScroll = modalContent.scrollHeight - modalContent.clientHeight;

        // تطبيق التمرير مع الحدود
        modalContent.scrollTop = Math.max(0, Math.min(maxScroll, newScroll));

        console.log('📊 تمرير الإعدادات:', {
            من: currentScroll,
            إلى: modalContent.scrollTop,
            المقدار: scrollAmount,
            الحد_الأقصى: maxScroll
        });
    }
}

// إعداد شريط التمرير السهل والواضح
function setupEasyScrollbar(modalContent, scrollbar, handle) {
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    // تحديث المقبض بطريقة بسيطة وواضحة
    function updateHandle() {
        const scrollTop = modalContent.scrollTop;
        const scrollHeight = modalContent.scrollHeight;
        const clientHeight = modalContent.clientHeight;

        console.log('📊 تحديث شريط التمرير:', {
            scrollTop,
            scrollHeight,
            clientHeight,
            needsScrollbar: scrollHeight > clientHeight
        });

        // إجبار إظهار الشريط دائماً
        scrollbar.style.display = 'block';
        scrollbar.style.visibility = 'visible';
        scrollbar.style.opacity = '1';
        console.log('✅ إجبار إظهار الشريط - مرئي دائماً');

        // إذا لا حاجة للتمرير، اجعل المقبض صغير
        if (scrollHeight <= clientHeight) {
            handle.style.height = '40px';
            handle.style.top = '0px';
            console.log('📏 محتوى قصير - مقبض ثابت');
            return;
        }

        // حساب حجم وموضع المقبض
        const scrollableHeight = scrollHeight - clientHeight;
        const scrollPercent = scrollableHeight > 0 ? scrollTop / scrollableHeight : 0;
        const handleHeight = Math.max(40, (clientHeight / scrollHeight) * clientHeight);
        const availableSpace = clientHeight - handleHeight;
        const handleTop = scrollPercent * availableSpace;

        handle.style.height = handleHeight + 'px';
        handle.style.top = handleTop + 'px';

        console.log('🎛️ مقبض:', {
            handleHeight: Math.round(handleHeight),
            handleTop: Math.round(handleTop),
            scrollPercent: Math.round(scrollPercent * 100) + '%'
        });
    }

    // تحديث عند التمرير
    modalContent.addEventListener('scroll', () => {
        updateHandle();
        console.log('🔄 تم التمرير');
    });

    // سحب المقبض
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startScrollTop = modalContent.scrollTop;
        document.body.style.userSelect = 'none';
        console.log('🖱️ بدء السحب');
        e.preventDefault();
    });

    // حركة السحب
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaY = e.clientY - startY;
        const scrollHeight = modalContent.scrollHeight;
        const clientHeight = modalContent.clientHeight;
        const scrollableHeight = scrollHeight - clientHeight;
        const handleHeight = Math.max(30, (clientHeight / scrollHeight) * clientHeight);
        const availableSpace = clientHeight - handleHeight;

        // حساب التمرير الجديد
        const scrollRatio = deltaY / availableSpace;
        const newScrollTop = startScrollTop + (scrollRatio * scrollableHeight);

        // تطبيق التمرير مع الحدود
        modalContent.scrollTop = Math.max(0, Math.min(scrollableHeight, newScrollTop));
    });

    // إنهاء السحب
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.userSelect = '';
            console.log('🖱️ انتهاء السحب');
        }
    });

    // النقر على الشريط للانتقال
    scrollbar.addEventListener('click', (e) => {
        if (e.target === scrollbar) {
            const rect = scrollbar.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const scrollPercent = clickY / rect.height;

            const scrollHeight = modalContent.scrollHeight;
            const clientHeight = modalContent.clientHeight;
            const scrollableHeight = scrollHeight - clientHeight;

            modalContent.scrollTop = scrollPercent * scrollableHeight;
        }
    });

    // عجلة الماوس
    modalContent.addEventListener('wheel', (e) => {
        const delta = e.deltaY;
        modalContent.scrollTop += delta;
    }, { passive: true });

    // ملاحظة: تم نقل التحكم بالكيبورد إلى وظيفة منفصلة للإعدادات
    // لتجنب التداخل وضمان عمل أفضل

    // تحديث أولي فوري مع إجبار الإظهار
    setTimeout(() => {
        // إجبار الإظهار أولاً
        scrollbar.style.display = 'block';
        scrollbar.style.visibility = 'visible';
        scrollbar.style.opacity = '1';
        handle.style.display = 'block';
        handle.style.visibility = 'visible';
        handle.style.opacity = '1';

        updateHandle();
        console.log('🔄 تحديث أولي مع إجبار الإظهار');
        console.log('✅ الشريط مُجبر على الظهور');
    }, 50);

    // إجبار إضافي بعد تأخير أطول
    setTimeout(() => {
        scrollbar.style.display = 'block';
        scrollbar.style.visibility = 'visible';
        scrollbar.style.opacity = '1';
        console.log('🔄 إجبار إضافي للإظهار');
    }, 200);

    // تحديث عند تغيير حجم النافذة
    window.addEventListener('resize', () => {
        updateHandle();
        console.log('🔄 تحديث عند تغيير الحجم');
    });
}



// دالة مساعدة لجلب اسم القسم من id
function getCategoryName(categoryId) {
    const allCats = [...appState.categories.main, ...appState.categories.sub, ...appState.categories.special, ...appState.categories.specialSub];
    const cat = allCats.find(c => c.id === categoryId);
    return cat ? cat.name : '';
}

// Setup add movies tab
function setupAddMoviesTab() {
    // Update category select options
    updateCategorySelectOptions();

    // Event listener for category change (إضافة يدوية)
    document.getElementById('movie-category').addEventListener('change', (e) => {
        const starNameGroup = document.getElementById('star-name-group');
        if (e.target.value === 'stars') {
            starNameGroup.classList.remove('hidden');
        } else {
            starNameGroup.classList.add('hidden');
        }
    });

    // Event listener for import category change (استيراد JSON)
    document.getElementById('import-category').addEventListener('change', (e) => {
        const importStarNameGroup = document.getElementById('import-star-name-group');
        if (e.target.value === 'stars') {
            importStarNameGroup.classList.remove('hidden');
        } else {
            importStarNameGroup.classList.add('hidden');
        }
    });

    // التحقق من القسم الحالي عند تحميل الصفحة (إضافة يدوية)
    const currentCategory = document.getElementById('movie-category').value;
    const starNameGroup = document.getElementById('star-name-group');
    if (currentCategory === 'stars') {
        starNameGroup.classList.remove('hidden');
    } else {
        starNameGroup.classList.add('hidden');
    }

    // التحقق من قسم الاستيراد الحالي عند تحميل الصفحة
    const currentImportCategory = document.getElementById('import-category').value;
    const importStarNameGroup = document.getElementById('import-star-name-group');
    if (currentImportCategory === 'stars') {
        importStarNameGroup.classList.remove('hidden');
    } else {
        importStarNameGroup.classList.add('hidden');
    }

    // Add movie button
    document.getElementById('add-movie-btn').onclick = addNewMovie;

    // Event listener for file input
    document.getElementById('movies-import-file').addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleMoviesImportFiles(e.target.files);
        }
    });

    // Import movies button
    document.getElementById('import-movies-btn').onclick = () => {
        document.getElementById('movies-import-file').click();
    };
}

// Generate unique ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Open settings modal
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const passwordSection = document.getElementById('password-section');
    const settingsContent = document.getElementById('settings-content');

    // Reset password input
    document.getElementById('password-input').value = '';

    // Show password section, hide settings content
    passwordSection.classList.remove('hidden');
    settingsContent.classList.add('hidden');

    // Show the modal
    modal.classList.add('show');

    // إجبار فوري لإظهار أي شريط تمرير موجود
    setTimeout(() => {
        forceShowAllScrollbars();
        console.log('💪 إجبار فوري عند فتح الإعدادات');
    }, 10);

    // تفعيل التحكم بالكيبورد
    setupSettingsKeyboardControls();

    // Setup submit password button
    document.getElementById('submit-password').onclick = validatePassword;

    // إضافة شريط التمرير الجانبي للمودال
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            createModalScrollbar(modalContent);
            console.log('✅ تم إضافة شريط التمرير لنافذة الإعدادات');

            // إجبار قوي لإظهار شريط الإعدادات
            setTimeout(() => {
                const scrollbar = modalContent.querySelector('.modal-scrollbar');
                const handle = modalContent.querySelector('.modal-scroll-handle');
                if (scrollbar) {
                    // إجبار الإظهار بقوة
                    scrollbar.style.display = 'block';
                    scrollbar.style.visibility = 'visible';
                    scrollbar.style.opacity = '1';
                    scrollbar.style.zIndex = '1001';

                    if (handle) {
                        handle.style.display = 'block';
                        handle.style.visibility = 'visible';
                        handle.style.opacity = '1';
                        handle.style.height = '60px';
                        handle.style.top = '10px';
                    }

                    console.log('💪 إجبار قوي لإظهار شريط الإعدادات');
                    console.log('📊 أبعاد المحتوى:', {
                        scrollHeight: modalContent.scrollHeight,
                        clientHeight: modalContent.clientHeight,
                        scrollbarVisible: scrollbar.style.display,
                        scrollbarOpacity: scrollbar.style.opacity
                    });
                }
            }, 100);

            // إجبار إضافي أقوى
            setTimeout(() => {
                const scrollbar = modalContent.querySelector('.modal-scrollbar');
                if (scrollbar) {
                    scrollbar.style.display = 'block';
                    scrollbar.style.visibility = 'visible';
                    scrollbar.style.opacity = '1';
                    console.log('💪💪 إجبار إضافي أقوى للإعدادات');
                }
            }, 500);
        }
    }, 100);

    // Setup close button
    modal.querySelector('.close').onclick = () => {
        modal.classList.remove('show');
        // إزالة التحكم بالكيبورد عند إغلاق الإعدادات
        document.removeEventListener('keydown', handleSettingsKeyboard);
        console.log('⌨️ تم إلغاء التحكم بالكيبورد عند إغلاق الإعدادات');
    };

    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            // إزالة التحكم بالكيبورد عند إغلاق الإعدادات
            document.removeEventListener('keydown', handleSettingsKeyboard);
            console.log('⌨️ تم إلغاء التحكم بالكيبورد عند النقر خارج الإعدادات');
        }
    };

    // Setup tabs
    setupSettingsTabs();
}

// Validate password
function validatePassword() {
    const passwordInput = document.getElementById('password-input');
    const password = passwordInput.value;

    if (password === appState.password) {
        // Hide password section, show settings content
        document.getElementById('password-section').classList.add('hidden');
        document.getElementById('settings-content').classList.remove('hidden');

        // إجبار قوي لإظهار شريط التمرير بعد إظهار المحتوى
        setTimeout(() => {
            forceShowAllScrollbars();
            console.log('💪 إجبار قوي بعد إدخال كلمة المرور');
        }, 50);

        // إجبار إضافي أقوى
        setTimeout(() => {
            forceShowAllScrollbars();
            console.log('💪💪 إجبار إضافي أقوى بعد إظهار المحتوى');
        }, 200);

        // تأكيد تفعيل التحكم بالكيبورد بعد إظهار المحتوى
        setTimeout(() => {
            setupSettingsKeyboardControls();
            console.log('⌨️ تم تأكيد تفعيل التحكم بالكيبورد بعد كلمة المرور');
        }, 100);
    } else {
        showToast('كلمة المرور غير صحيحة', 'error');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Setup settings tabs
function setupSettingsTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to the selected button and content
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');

            // Setup the selected tab content
            setupTabContent(tabId);

            // تأكيد التحكم بالكيبورد عند تغيير التبويب
            setTimeout(() => {
                setupSettingsKeyboardControls();
                console.log(`⌨️ تم تأكيد التحكم بالكيبورد للتبويب: ${tabId}`);
            }, 100);
        });
    });

    // Setup the first tab content by default
    setupTabContent('protection');
}

// Setup tab content
function setupTabContent(tabId) {
    switch (tabId) {
        case 'protection':
            setupProtectionTab();
            break;
        case 'data':
            setupDataTab();
            break;
        case 'add-movies':
            setupAddMoviesTab();
            break;
        case 'manage-categories':
            setupManageCategoriesTab();
            break;
        case 'manage-movies':
            setupManageMoviesTab();
            break;
        case 'manage-sites':
            setupManageSitesTab();
            break;
    }
}

// Setup protection tab
function setupProtectionTab() {
    // Change password button
    document.getElementById('change-password-btn').onclick = () => {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!newPassword) {
            showToast('يرجى إدخال كلمة مرور جديدة', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('كلمات المرور غير متطابقة', 'error');
            return;
        }

        appState.password = newPassword;
        saveAppData();

        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

        showToast('تم تغيير كلمة المرور بنجاح', 'success');
    };

    // Toggle special sections button
    document.getElementById('toggle-special-btn').onclick = () => {
        appState.showSpecialSections = !appState.showSpecialSections;
        saveAppData();
        toggleSpecialSectionsVisibility();

        const message = appState.showSpecialSections ? 'تم إظهار الأقسام الخاصة' : 'تم إخفاء الأقسام الخاصة';
        showToast(message, 'success');
    };

    // Setup open movies externally
    const movieOpenMode = document.getElementById('movie-open-mode');
    movieOpenMode.value = appState.openMoviesExternally ? 'external' : 'internal';

    // Save open mode button
    document.getElementById('save-open-mode-btn').onclick = () => {
        appState.openMoviesExternally = (movieOpenMode.value === 'external');
        saveAppData();
        showToast('تم حفظ إعدادات تشغيل الأفلام بنجاح', 'success');
    };
}

// Setup data tab
function setupDataTab() {
    // Export all data button
    document.getElementById('export-all-btn').onclick = exportAllData;

    // Export by date button
    document.getElementById('export-by-date-btn').onclick = exportDataByDate;

    // إضافة مستمع حدث لتغيير نوع التصدير
    document.getElementById('export-date-type').addEventListener('change', function() {
        const exportType = this.value;
        const afterDateOptions = document.getElementById('after-date-options');
        const lastDaysOptions = document.getElementById('last-days-options');
        const lastCountOptions = document.getElementById('last-count-options');

        // إخفاء جميع الخيارات أولاً
        afterDateOptions.classList.add('hidden');
        lastDaysOptions.classList.add('hidden');
        lastCountOptions.classList.add('hidden');

        // إظهار الخيارات المناسبة
        if (exportType === 'after-date') {
            afterDateOptions.classList.remove('hidden');
        } else if (exportType === 'last-days') {
            lastDaysOptions.classList.remove('hidden');
        } else if (exportType === 'last-count') {
            lastCountOptions.classList.remove('hidden');
        }
    });

    // File input event listener
    document.getElementById('import-file-input').addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleImportFiles(e.target.files);
        }
    });

    // Import button (الطريقة العادية)
    document.getElementById('import-btn').onclick = () => {
        document.getElementById('import-file-input').click();
    };

    // Enhanced Import button (الاستيراد المحسن)
    const enhancedImportBtn = document.getElementById('enhanced-import-btn');
    const enhancedImportFile = document.getElementById('enhanced-import-file');

    if (enhancedImportBtn && enhancedImportFile) {
        enhancedImportBtn.onclick = () => {
            enhancedImportFile.click();
        };

        enhancedImportFile.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await handleEnhancedImportFiles(e.target.files);
            }
        });
    }

    // Delete all data button
    document.getElementById('delete-all-data-btn').onclick = () => {
        // Show confirmation modal
        const modal = document.getElementById('confirm-modal');
        const messageElement = document.getElementById('confirm-message');

        messageElement.textContent = 'هل أنت متأكد من رغبتك في حذف كل بيانات التطبيق؟ هذا الإجراء لا يمكن التراجع عنه!';

        // Show the modal
        modal.classList.add('show');

        // Yes button
        document.getElementById('confirm-yes').onclick = () => {
            deleteAllAppData();
            modal.classList.remove('show');
        };

        // No button
        document.getElementById('confirm-no').onclick = () => {
            modal.classList.remove('show');
        };
    };

    // زر تعيين سرعة الاستيراد الافتراضية
    document.getElementById('set-default-speed-btn').addEventListener('click', () => {
        const selectedSpeed = document.querySelector('input[name="import-speed"]:checked').value;
        saveDefaultImportSpeed(selectedSpeed);
    });
}

// Export all data
function exportAllData() {
    const exportData = {
        movies: appState.movies,
        series: appState.series,
        categories: appState.categories,
        settings: {
            showSpecialSections: appState.showSpecialSections,
            viewMode: appState.viewMode,
            sortBy: appState.sortBy,
            itemsPerPage: appState.itemsPerPage,
            openMoviesExternally: appState.openMoviesExternally
        }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileName = `movies_app_data_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();

    showToast('تم تصدير بيانات التطبيق بنجاح', 'success');
}

// تصدير البيانات حسب التاريخ
function exportDataByDate() {
    let startDate;
    const exportType = document.getElementById('export-date-type').value;

    if (exportType === 'after-date') {
        const dateInput = document.getElementById('export-after-date').value;
        if (!dateInput) {
            showToast('يرجى تحديد التاريخ', 'warning');
            return;
        }
        startDate = new Date(dateInput);
    } else if (exportType === 'last-days') {
        const daysCount = parseInt(document.getElementById('export-days-count').value);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - daysCount);
    }

    // تحديد الأفلام والمسلسلات للتصدير
    let filteredMovies = [];
    let filteredSeries = [];

    if (exportType === 'last-count') {
        // الحصول على عدد الأفلام المطلوب تصديرها
        const moviesCount = parseInt(document.getElementById('export-movies-count').value);
        if (!moviesCount || moviesCount <= 0) {
            showToast('يرجى إدخال عدد صحيح للأفلام', 'warning');
            return;
        }

        // ترتيب الأفلام حسب تاريخ الإضافة (الأحدث أولاً)
        const sortedMovies = [...appState.movies].sort((a, b) => {
            const dateA = new Date(a.addedDate);
            const dateB = new Date(b.addedDate);
            return dateB - dateA;
        });

        // أخذ آخر عدد محدد من الأفلام
        filteredMovies = sortedMovies.slice(0, moviesCount);

        // ترتيب المسلسلات حسب تاريخ الإضافة (الأحدث أولاً)
        const sortedSeries = [...appState.series].sort((a, b) => {
            const dateA = new Date(a.addedDate);
            const dateB = new Date(b.addedDate);
            return dateB - dateA;
        });

        // أخذ آخر عدد محدد من المسلسلات (نفس العدد أو أقل إذا كان العدد الكلي أقل)
        filteredSeries = sortedSeries.slice(0, moviesCount);
    } else {
        // تحويل التاريخ إلى منتصف الليل لضمان تضمين كل البيانات من ذلك اليوم
        startDate.setHours(0, 0, 0, 0);

        // فلترة البيانات حسب التاريخ
        filteredMovies = appState.movies.filter(movie => {
            const movieDate = new Date(movie.addedDate);
            return movieDate >= startDate;
        });

        filteredSeries = appState.series.filter(series => {
            const seriesDate = new Date(series.addedDate);
            return seriesDate >= startDate;
        });
    }

    // التحقق من وجود بيانات للتصدير
    if (filteredMovies.length === 0 && filteredSeries.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return;
    }

    // إنشاء كائن البيانات للتصدير
    const exportData = {
        movies: filteredMovies,
        series: filteredSeries,
        exportInfo: {
            exportDate: new Date().toISOString(),
            exportType: exportType,
            totalMovies: filteredMovies.length,
            totalSeries: filteredSeries.length
        }
    };

    // إضافة معلومات إضافية حسب نوع التصدير
    if (exportType === 'after-date') {
        exportData.exportInfo.startDate = startDate.toISOString();
    } else if (exportType === 'last-days') {
        const daysCount = document.getElementById('export-days-count').value;
        exportData.exportInfo.daysCount = parseInt(daysCount);
        exportData.exportInfo.startDate = startDate.toISOString();
    } else if (exportType === 'last-count') {
        const moviesCount = document.getElementById('export-movies-count').value;
        exportData.exportInfo.requestedCount = parseInt(moviesCount);
    }

    // تصدير البيانات
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    // تحديد اسم الملف بناءً على نوع التصدير
    let exportFileName;
    if (exportType === 'after-date') {
        const dateStr = document.getElementById('export-after-date').value;
        exportFileName = `movies_data_after_${dateStr}.json`;
    } else if (exportType === 'last-days') {
        const daysCount = document.getElementById('export-days-count').value;
        exportFileName = `movies_data_last_${daysCount}_days.json`;
    } else if (exportType === 'last-count') {
        const moviesCount = document.getElementById('export-movies-count').value;
        exportFileName = `movies_data_last_${moviesCount}_items.json`;
    }

    // تنزيل الملف
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();

    // عرض رسالة نجاح
    showToast(`تم تصدير ${filteredMovies.length} فيلم و ${filteredSeries.length} مسلسل بنجاح`, 'success');
}

// إعداد أداة ترتيب الأفلام في إدارة الأقسام
function setupCategorySortingTool() {
    const manageCategorySelect = document.getElementById('manage-category-select');
    const categorySortOptions = document.getElementById('category-sort-options');
    const categorySiteFilter = document.getElementById('category-site-filter');
    const categoryStarFilter = document.getElementById('category-star-filter');
    const categoryViewMode = document.getElementById('category-view-mode');
    const applyCategorySorting = document.getElementById('apply-category-sorting');
    const saveCategorySorting = document.getElementById('save-category-sorting');

    // تحديث خيارات الفلترة عند تغيير القسم
    manageCategorySelect.addEventListener('change', () => {
        updateCategorySortingFilters();
    });

    // تحديث خيارات الفلترة عند تغيير طريقة الترتيب
    categorySortOptions.addEventListener('change', () => {
        updateCategorySortingFilterVisibility();
        updateCategorySortingFilters();
    });

    // تطبيق الترتيب
    applyCategorySorting.addEventListener('click', () => {
        applyCategorySortingToMainPage();
    });

    // حفظ الترتيب كإعداد افتراضي
    saveCategorySorting.addEventListener('click', () => {
        saveCategorySortingAsDefault();
    });

    // تهيئة الفلاتر
    updateCategorySortingFilters();
    updateCategorySortingFilterVisibility();
}

// تحديث فلاتر أداة ترتيب الأفلام
function updateCategorySortingFilters() {
    const selectedCategory = document.getElementById('manage-category-select').value;
    const sortBy = document.getElementById('category-sort-options').value;

    if (!selectedCategory) return;

    // تحديث فلتر المواقع
    updateCategorySiteFilter(selectedCategory);

    // تحديث فلتر النجوم إذا كان القسم هو أفلام النجوم
    if (selectedCategory === 'stars') {
        updateCategoryStarFilter();
    }
}

// تحديث رؤية فلاتر أداة ترتيب الأفلام
function updateCategorySortingFilterVisibility() {
    const sortBy = document.getElementById('category-sort-options').value;
    const selectedCategory = document.getElementById('manage-category-select').value;

    const siteFilterGroup = document.getElementById('category-site-filter').closest('.form-group');
    const starFilterGroup = document.getElementById('category-star-filter').closest('.form-group');
    const starSortOption = document.querySelector('#category-sort-options .star-sort-option');

    // إظهار/إخفاء فلتر المواقع
    if (sortBy === 'site') {
        siteFilterGroup.style.display = 'flex';
        document.getElementById('category-site-filter').classList.remove('hidden');
    } else {
        siteFilterGroup.style.display = 'none';
        document.getElementById('category-site-filter').classList.add('hidden');
    }

    // إظهار/إخفاء خيار ترتيب النجوم وفلتر النجوم
    if (selectedCategory === 'stars') {
        starSortOption.classList.remove('hidden');
        if (sortBy === 'star') {
            starFilterGroup.style.display = 'flex';
            document.getElementById('category-star-filter').classList.remove('hidden');
        } else {
            starFilterGroup.style.display = 'none';
            document.getElementById('category-star-filter').classList.add('hidden');
        }
    } else {
        starSortOption.classList.add('hidden');
        starFilterGroup.style.display = 'none';
        document.getElementById('category-star-filter').classList.add('hidden');
    }
}

// تحديث فلتر المواقع لأداة ترتيب الأفلام
function updateCategorySiteFilter(categoryId) {
    const siteFilter = document.getElementById('category-site-filter');
    if (!siteFilter) return;

    const currentValue = siteFilter.value;
    siteFilter.innerHTML = '<option value="">جميع المواقع</option>';

    try {
        const categoryMovies = appState.movies.filter(movie =>
            movie.category === categoryId && !movie.hidden
        );

        const sites = new Set();
        categoryMovies.forEach(movie => {
            const site = getSiteFromUrl(movie.href);
            if (site) {
                sites.add(site);
            }
        });

        const sitesArray = Array.from(sites).sort();
        sitesArray.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            option.textContent = site;
            siteFilter.appendChild(option);
        });

        // إذا لم تكن هناك قيمة محددة مسبقاً، اختر الموقع الأول تلقائياً
        if (currentValue && Array.from(siteFilter.options).some(opt => opt.value === currentValue)) {
            siteFilter.value = currentValue;
        } else if (sitesArray.length > 0) {
            // اختيار الموقع الأول تلقائياً
            siteFilter.value = sitesArray[0];
        }
    } catch (error) {
        console.error('خطأ في تحديث فلتر المواقع:', error);
    }
}

// تحديث فلتر النجوم لأداة ترتيب الأفلام
function updateCategoryStarFilter() {
    const starFilter = document.getElementById('category-star-filter');
    if (!starFilter) return;

    const currentValue = starFilter.value;
    starFilter.innerHTML = '<option value="">جميع النجوم</option>';

    try {
        const starsMovies = appState.movies.filter(movie =>
            movie.category === 'stars' && !movie.hidden
        );

        const stars = new Set();
        starsMovies.forEach(movie => {
            if (movie.starName) {
                stars.add(movie.starName);
            }
        });

        stars.forEach(star => {
            const option = document.createElement('option');
            option.value = star;
            option.textContent = star;
            starFilter.appendChild(option);
        });

        if (currentValue && Array.from(starFilter.options).some(opt => opt.value === currentValue)) {
            starFilter.value = currentValue;
        }
    } catch (error) {
        console.error('خطأ في تحديث فلتر النجوم:', error);
    }
}

// تطبيق الترتيب على الصفحة الرئيسية
function applyCategorySortingToMainPage() {
    const selectedCategory = document.getElementById('manage-category-select').value;
    const sortBy = document.getElementById('category-sort-options').value;
    const siteFilter = document.getElementById('category-site-filter').value;
    const starFilter = document.getElementById('category-star-filter').value;
    const viewMode = document.getElementById('category-view-mode').value;

    if (!selectedCategory) {
        showToast('يرجى اختيار قسم أولاً', 'warning');
        return;
    }

    // تطبيق الإعدادات على الصفحة الرئيسية
    appState.sortBy = sortBy;
    appState.selectedSite = siteFilter;
    appState.selectedStar = starFilter;
    appState.viewMode = viewMode;

    // تحديث عناصر الواجهة في الصفحة الرئيسية
    const mainSortOptions = document.getElementById('sort-options');
    const mainSiteFilter = document.getElementById('site-filter');
    const mainStarFilter = document.getElementById('star-filter');
    const mainViewMode = document.getElementById('view-mode');

    if (mainSortOptions) mainSortOptions.value = sortBy;
    if (mainSiteFilter) mainSiteFilter.value = siteFilter;
    if (mainStarFilter) mainStarFilter.value = starFilter;
    if (mainViewMode) mainViewMode.value = viewMode;

    // تحديث رؤية الفلاتر في الصفحة الرئيسية
    updateFilterVisibility();

    // عرض القسم المحدد في الصفحة الرئيسية
    displayMovies(selectedCategory, 1); // هنا نريد الانتقال للأعلى عند تطبيق الترتيب

    // إغلاق مودال الإعدادات
    document.getElementById('settings-modal').classList.remove('show');

    showToast('تم تطبيق الترتيب على الصفحة الرئيسية بنجاح', 'success');
}

// حفظ الترتيب كإعداد افتراضي للقسم
function saveCategorySortingAsDefault() {
    const selectedCategory = document.getElementById('manage-category-select').value;
    const sortBy = document.getElementById('category-sort-options').value;
    const siteFilter = document.getElementById('category-site-filter').value;
    const starFilter = document.getElementById('category-star-filter').value;
    const viewMode = document.getElementById('category-view-mode').value;

    if (!selectedCategory) {
        showToast('يرجى اختيار قسم أولاً', 'warning');
        return;
    }

    // حفظ الإعدادات كإعدادات افتراضية
    appState.sortBy = sortBy;
    appState.selectedSite = siteFilter;
    appState.selectedStar = starFilter;
    appState.viewMode = viewMode;

    // حفظ البيانات
    saveAppData();

    showToast(`تم حفظ إعدادات الترتيب كإعداد افتراضي بنجاح`, 'success');
}



// Setup manage categories tab
function setupManageCategoriesTab() {
    // Update category select options
    updateCategorySelectOptions();

    // إعداد أداة ترتيب الأفلام
    setupCategorySortingTool();

    // إعداد إدارة الأقسام
    setupCategoryManagement();

    // Delete category movies button
    document.getElementById('delete-category-movies').onclick = () => {
        const categoryId = document.getElementById('manage-category-select').value;
        if (!categoryId) {
            showToast('يرجى اختيار قسم', 'warning');
            return;
        }

        // Show confirmation modal
        const modal = document.getElementById('confirm-modal');
        const messageElement = document.getElementById('confirm-message');

        messageElement.textContent = `هل أنت متأكد من رغبتك في حذف جميع الأفلام من قسم "${getCategoryName(categoryId)}"؟`;

        // Show the modal
        modal.classList.add('show');

        // Yes button
        document.getElementById('confirm-yes').onclick = () => {
            deleteCategoryMovies(categoryId);
            modal.classList.remove('show');
        };

        // No button
        document.getElementById('confirm-no').onclick = () => {
            modal.classList.remove('show');
        };
    };

    // Move category movies button
    document.getElementById('move-category-movies').onclick = () => {
        const categoryId = document.getElementById('manage-category-select').value;
        if (!categoryId) {
            showToast('يرجى اختيار قسم', 'warning');
            return;
        }

        // Update target category options
        updateTargetCategoryOptions(categoryId);

        // Show move category dialog
        document.getElementById('move-category-dialog').classList.remove('hidden');
    };

    // Confirm move category button
    document.getElementById('confirm-move-category').onclick = () => {
        const sourceCategory = document.getElementById('manage-category-select').value;
        const targetCategory = document.getElementById('target-category-select').value;

        if (!sourceCategory || !targetCategory) {
            showToast('يرجى اختيار القسم المصدر والقسم الهدف', 'warning');
            return;
        }

        moveCategoryMovies(sourceCategory, targetCategory);
        document.getElementById('move-category-dialog').classList.add('hidden');
    };

    // Cancel move category button
    document.getElementById('cancel-move-category').onclick = () => {
        document.getElementById('move-category-dialog').classList.add('hidden');
    };

    // Copy category movies button
    document.getElementById('copy-category-movies').onclick = () => {
        const categoryId = document.getElementById('manage-category-select').value;
        if (!categoryId) {
            showToast('يرجى اختيار قسم', 'warning');
            return;
        }

        // Update target category options for copy
        updateCopyTargetCategoryOptions(categoryId);

        // Show copy category dialog
        document.getElementById('copy-category-dialog').classList.remove('hidden');
    };

    // Confirm copy category button
    document.getElementById('confirm-copy-category').onclick = () => {
        const sourceCategory = document.getElementById('manage-category-select').value;
        const targetCategory = document.getElementById('copy-target-category-select').value;

        if (!sourceCategory || !targetCategory) {
            showToast('يرجى اختيار القسم المصدر والقسم الهدف', 'warning');
            return;
        }

        moveCategoryMovies(sourceCategory, targetCategory, true); // true للنسخ
        document.getElementById('copy-category-dialog').classList.add('hidden');
    };

    // Cancel copy category button
    document.getElementById('cancel-copy-category').onclick = () => {
        document.getElementById('copy-category-dialog').classList.add('hidden');
    };

    // Toggle category visibility button
    document.getElementById('toggle-category-visibility').onclick = () => {
        const categoryId = document.getElementById('manage-category-select').value;
        if (!categoryId) {
            showToast('يرجى اختيار قسم', 'warning');
            return;
        }

        toggleCategoryVisibility(categoryId);
    };

    // Export category button
    document.getElementById('export-category').onclick = () => {
        const categoryId = document.getElementById('manage-category-select').value;
        if (!categoryId) {
            showToast('يرجى اختيار قسم', 'warning');
            return;
        }

        exportCategoryData(categoryId);
    };

    // Import to category button
    document.getElementById('import-to-category').onclick = () => {
        const categoryId = document.getElementById('manage-category-select').value;
        if (!categoryId) {
            showToast('يرجى اختيار قسم', 'warning');
            return;
        }

        // Set the target category
        document.getElementById('import-category').value = categoryId;

        // Switch to the add movies tab
        const addMoviesTab = document.querySelector('.tab-btn[data-tab="add-movies"]');
        addMoviesTab.click();

        // Scroll to the import dropzone
        document.getElementById('movies-import-dropzone').scrollIntoView({ behavior: 'smooth' });
    };

    // Clean names button
    document.getElementById('clean-names-btn').onclick = () => {
        const categoryId = document.getElementById('manage-category-select').value;
        if (!categoryId) {
            showToast('يرجى اختيار قسم', 'warning');
            return;
        }

        openCleanNamesModal(categoryId);
    };
}

// Open clean names modal
function openCleanNamesModal(categoryId) {
    const modal = document.getElementById('clean-names-modal');
    const categoryNameElement = document.getElementById('clean-category-name');

    categoryNameElement.textContent = getCategoryName(categoryId);
    document.getElementById('clean-category-id').value = categoryId;

    // If there is a saved list of words to remove, display it
    const wordsInput = document.getElementById('words-to-remove');
    const savedWords = localStorage.getItem('wordsToRemove');
    if (savedWords) {
        wordsInput.value = savedWords;
    }

    // إعداد التظليل التلقائي لخانات الإدخال
    setupAutoSelectInputs(modal);

    // Show the modal
    modal.classList.add('show');

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            createModalScrollbar(modalContent);
            console.log('✅ تم إضافة شريط التمرير لنافذة تنظيف الأسماء');
        }
    }, 100);
}

// Clean movie names in a category
function cleanMovieNames(categoryId, wordsToRemove) {
    // Split the input into an array of words
    const words = wordsToRemove.split('\n').filter(word => word.trim() !== '');

    // Save the list of words for future use
    localStorage.setItem('wordsToRemove', wordsToRemove);

    let cleanedCount = 0;

    // Determine which array to work on (movies or series)
    let targetArray = categoryId === 'series' ? appState.series : appState.movies;
    let isSubcategory = appState.categories.sub.some(cat => cat.id === categoryId) ||
                       appState.categories.specialSub.some(cat => cat.id === categoryId);

    if (categoryId === 'all') {
        // Clean all movies and series
        cleanedCount += cleanArrayNames(appState.movies, words);
        cleanedCount += cleanArrayNames(appState.series, words);
    } else if (isSubcategory) {
        // Clean items in the specified subcategory
        cleanedCount += cleanArrayNamesInSubcategory(appState.movies, categoryId, words);
        cleanedCount += cleanArrayNamesInSubcategory(appState.series, categoryId, words);
    } else {
        // Clean items in the specified main category
        if (categoryId === 'series') {
            cleanedCount += cleanArrayNames(appState.series, words);
        } else {
            cleanedCount += cleanArrayNames(targetArray.filter(item => item.category === categoryId), words);
        }
    }

    // Save the data and update the interface
    saveAppData();
    if (appState.currentCategory === categoryId || appState.currentCategory === 'all') {
        // حفظ موضع التمرير الحالي
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);

        // استعادة موضع التمرير بعد تحديث الواجهة
        setTimeout(() => {
            window.scrollTo(0, currentScrollPosition);
        }, 50);
    }

    showToast(`تم تنظيف أسماء ${cleanedCount} فيلم في قسم "${getCategoryName(categoryId)}"`, 'success');
}

// Clean array names
function cleanArrayNames(array, words) {
    let cleanedCount = 0;

    array.forEach(item => {
        const originalName = item.name;
        let newName = originalName;

        // Remove each word from the name
        words.forEach(word => {
            const regex = new RegExp(word.trim(), 'gi');
            newName = newName.replace(regex, '').trim();
        });

        // Remove multiple spaces
        newName = newName.replace(/\s+/g, ' ').trim();

        // Update the name if it changed
        if (newName !== originalName && newName.length > 0) {
            item.name = newName;
            cleanedCount++;
        }
    });

    return cleanedCount;
}

// Clean array names in a subcategory
function cleanArrayNamesInSubcategory(array, subcategoryId, words) {
    let cleanedCount = 0;

    array.forEach(item => {
        if (item.subCategories && item.subCategories.includes(subcategoryId)) {
            const originalName = item.name;
            let newName = originalName;

            // Remove each word from the name
            words.forEach(word => {
                const regex = new RegExp(word.trim(), 'gi');
                newName = newName.replace(regex, '').trim();
            });

            // Remove multiple spaces
            newName = newName.replace(/\s+/g, ' ').trim();

            // Update the name if it changed
            if (newName !== originalName && newName.length > 0) {
                item.name = newName;
                cleanedCount++;
            }
        }
    });

    return cleanedCount;
}

// Delete category movies
function deleteCategoryMovies(categoryId) {
    if (categoryId === 'all') {
        showToast('لا يمكن حذف محتوى هذا القسم', 'warning');
        return;
    }

    let deletedCount = 0;

    if (categoryId === 'series') {
        // حذف جميع المسلسلات
        const originalCount = appState.series.length;
        appState.series = [];
        deletedCount = originalCount;
    } else {
        // حذف الأفلام من القسم المحدد
        const originalCount = appState.movies.filter(movie => movie.category === categoryId).length;
        appState.movies = appState.movies.filter(movie => movie.category !== categoryId);
        deletedCount = originalCount;
    }

    // حفظ موضع التمرير الحالي
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    saveAppData();
    updateCategoriesCounts();
    renderCategories();
    displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);

    // تحديث العداد في إدارة الأقسام
    updateCategoryCount();

    // استعادة موضع التمرير بعد تحديث الواجهة
    setTimeout(() => {
        window.scrollTo(0, currentScrollPosition);
    }, 50);

    showToast(`تم حذف ${deletedCount} عنصر من قسم "${getCategoryName(categoryId)}" بنجاح`, 'success');
}

// Move category movies
function moveCategoryMovies(sourceCategory, targetCategory, copyMode = false) {
    let processedCount = 0;

    if (sourceCategory === 'series') {
        if (copyMode) {
            // إذا كان القسم الهدف هو "series" لا تقم بالنسخ
            if (targetCategory === 'series') {
                showToast('لا يمكن نسخ المسلسلات إلى نفس القسم', 'warning');
                return;
            }
            // نسخ جميع المسلسلات إلى قسم آخر (تضاف إلى appState.movies)
            const originalSeries = [...appState.series];
            const newMovies = originalSeries.map(series => ({
                ...series,
                id: Date.now() + Math.random(),
                category: targetCategory
            }));
            appState.movies = appState.movies.concat(newMovies);
            processedCount = newMovies.length;
        } else {
            // نقل جميع المسلسلات إلى القسم الجديد (تتحول إلى أفلام)
            if (targetCategory === 'series') {
                showToast('القسم الهدف هو نفس القسم الحالي', 'warning');
                return;
            }
            const newMovies = appState.series.map(series => ({
                ...series,
                id: Date.now() + Math.random(),
                category: targetCategory
            }));
            appState.movies = appState.movies.concat(newMovies);
            appState.series = [];
            processedCount = newMovies.length;
        }
    } else {
        const moviesToProcess = appState.movies.filter(movie => movie.category === sourceCategory);
        if (copyMode) {
            if (targetCategory === 'series') {
                // نسخ الأفلام إلى قسم المسلسلات
                const newSeries = moviesToProcess.map(movie => ({
                    ...movie,
                    id: Date.now() + Math.random(),
                    category: undefined // أو 'series' إذا أردت
                }));
                appState.series = appState.series.concat(newSeries);
                processedCount = newSeries.length;
            } else {
                // نسخ الأفلام إلى قسم آخر
                moviesToProcess.forEach(movie => {
                    const copiedMovie = {
                        ...movie,
                        id: Date.now() + Math.random(),
                        category: targetCategory
                    };
                    appState.movies.push(copiedMovie);
                    processedCount++;
                });
            }
        } else {
            if (targetCategory === 'series') {
                // نقل الأفلام إلى قسم المسلسلات
                const newSeries = moviesToProcess.map(movie => ({
                    ...movie,
                    id: Date.now() + Math.random(),
                    category: undefined // أو 'series' إذا أردت
                }));
                appState.series = appState.series.concat(newSeries);
                // حذف المنقولين من movies
                appState.movies = appState.movies.filter(movie => movie.category !== sourceCategory);
                processedCount = newSeries.length;
            } else {
                // نقل الأفلام إلى قسم آخر
                appState.movies.forEach(movie => {
                    if (movie.category === sourceCategory) {
                        movie.category = targetCategory;
                        processedCount++;
                    }
                });
            }
        }
    }

    saveAppData();
    updateCategoriesCounts();
    renderCategories();
    displayMovies(appState.currentCategory, appState.currentPage);

    // تحديث العداد في إدارة الأقسام
    updateCategoryCount();

    const actionText = copyMode ? 'نسخ' : 'نقل';
    showToast(`تم ${actionText} ${processedCount} عنصر من "${getCategoryName(sourceCategory)}" إلى "${getCategoryName(targetCategory)}" بنجاح`, 'success');
}

// Update target category options for move
function updateTargetCategoryOptions(excludeCategoryId) {
    const targetSelect = document.getElementById('target-category-select');
    if (!targetSelect) return;

    targetSelect.innerHTML = '';

    // إضافة الأقسام الرئيسية
    appState.categories.main.forEach(category => {
        if (category.id !== excludeCategoryId) {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            targetSelect.appendChild(option);
        }
    });

    // إضافة قسم المسلسلات إذا لم يكن هو المستبعد
    if (excludeCategoryId !== 'series') {
        const option = document.createElement('option');
        option.value = 'series';
        option.textContent = 'المسلسلات';
        targetSelect.appendChild(option);
    }
}

// Update target category options for copy
function updateCopyTargetCategoryOptions(sourceCategoryId) {
    const targetSelect = document.getElementById('copy-target-category-select');
    if (!targetSelect) return;

    targetSelect.innerHTML = '';

    // إضافة الأقسام الرئيسية (يمكن النسخ إلى نفس القسم)
    appState.categories.main.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        targetSelect.appendChild(option);
    });

    // إضافة قسم المسلسلات
    const seriesOption = document.createElement('option');
    seriesOption.value = 'series';
    seriesOption.textContent = 'المسلسلات';
    targetSelect.appendChild(seriesOption);
}

// إعداد إدارة الأقسام
function setupCategoryManagement() {
    // تحديث قائمة الأقسام في إدارة الأقسام
    const manageCategorySelect = document.getElementById('manage-category-select');
    
    if (manageCategorySelect) {
        // إضافة مستمع حدث لعرض عدد الأفلام في القسم المحدد
        manageCategorySelect.addEventListener('change', () => {
            updateCategoriesCounts(); // تحديث جميع العدادات أولاً
            updateCategoryCount();    // ثم تحديث عداد القسم المحدد
        });
        
        // تحديث عدد الأفلام في القسم المحدد افتراضيًا
        updateCategoriesCounts();
        updateCategoryCount();
    }
}

// تحديث عداد الأفلام للقسم المختار
function updateCategoryCount() {
    const categorySelect = document.getElementById('manage-category-select');
    const countDisplay = document.getElementById('category-count-display');
    if (!categorySelect || !countDisplay) return;

    const selectedCategoryId = categorySelect.value;
    if (!selectedCategoryId) {
        countDisplay.style.display = 'none';
        return;
    }

    // البحث عن القسم في جميع أنواع الأقسام
    const categoryTypes = ['main', 'sub', 'special', 'specialSub'];
    let category = null;
    for (const type of categoryTypes) {
        category = appState.categories[type].find(cat => cat.id === selectedCategoryId);
        if (category) break;
    }
    if (category) {
        countDisplay.style.display = 'inline-block';
        // تحديث النص حسب نوع القسم
        const icon = selectedCategoryId === 'series' ? 'fas fa-tv' : 'fas fa-film';
        const text = selectedCategoryId === 'series' ? 'عدد المسلسلات' : 'عدد الأفلام/المسلسلات';
        countDisplay.innerHTML = `<i class="${icon}"></i> ${text}: <span style=\"color: #2196f3; font-size: 16px;\">${category.count}</span>`;
    } else {
        countDisplay.style.display = 'none';
    }
}

// Toggle category visibility
function toggleCategoryVisibility(categoryId) {
    if (categoryId === 'all' || categoryId === 'series') {
        showToast('لا يمكن إخفاء هذا القسم الأساسي', 'warning');
        return;
    }

    // البحث عن القسم في الأقسام الرئيسية
    let category = appState.categories.main.find(cat => cat.id === categoryId);
    let categoryType = 'main';

    // إذا لم يوجد في الرئيسية، ابحث في الخاصة
    if (!category) {
        category = appState.categories.special.find(cat => cat.id === categoryId);
        categoryType = 'special';
    }

    if (!category) {
        showToast('القسم غير موجود', 'error');
        return;
    }

    // تبديل حالة الإخفاء
    category.hidden = !category.hidden;

    // حفظ البيانات
    saveAppData();

    // تحديث عرض الأقسام
    renderCategories();

    // تحديث العداد في إدارة الأقسام
    updateCategoryCount();

    // رسالة التأكيد
    const action = category.hidden ? 'إخفاء' : 'إظهار';
    const categoryName = category.name || getCategoryName(categoryId);

    showToast(`تم ${action} قسم "${categoryName}" بنجاح`, 'success');

    console.log(`🔄 تم ${action} القسم: ${categoryName} (${categoryId})`);

    // تحديث العرض الحالي إذا كان المستخدم في قسم مخفي
    if (category.hidden && appState.currentCategory === categoryId) {
        // الانتقال إلى قسم "الكل"
        displayMovies('all', 1);
        showToast('تم الانتقال إلى قسم "الكل" لأن القسم الحالي مخفي', 'info');
    }
}

// Export category data
function exportCategoryData(categoryId) {
    let exportData = {};

    if (categoryId === 'series') {
        // تصدير المسلسلات من القسم الرئيسي
        const seriesInCategory = appState.series.filter(series => series.category === categoryId);
        exportData = { series_info: seriesInCategory };
    } else {
        // البحث عن الأفلام في القسم الرئيسي والأقسام الفرعية
        const moviesInCategory = appState.movies.filter(movie =>
            movie.category === categoryId ||
            (movie.subCategories && movie.subCategories.includes(categoryId))
        );

        exportData = { movies_info: moviesInCategory };
    }

    // التحقق من وجود بيانات للتصدير
    const hasData = (exportData.series_info && exportData.series_info.length > 0) ||
                   (exportData.movies_info && exportData.movies_info.length > 0);

    if (!hasData) {
        showToast(`لا توجد بيانات في قسم "${getCategoryName(categoryId)}" للتصدير`, 'warning');
        return;
    }

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileName = `${categoryId}_data_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();

    showToast(`تم تصدير بيانات قسم "${getCategoryName(categoryId)}" بنجاح`, 'success');
}

// تحسين استجابة عناصر select في متصفحات الأندرويد القديمة
function enhanceSelectElements() {
    const selectElements = document.querySelectorAll('select');

    selectElements.forEach(select => {
        // إضافة معالج حدث اللمس
        select.addEventListener('touchstart', function(e) {
            // منع السلوك الافتراضي للمتصفح في بعض الحالات
            if (navigator.userAgent.match(/Android\s([0-9\.]*)/)) {
                const version = parseFloat(RegExp.$1);
                if (version < 7) { // للإصدارات القديمة من أندرويد
                    e.preventDefault();
                    // محاكاة النقر
                    this.click();
                }
            }
        }, false);

        // تحسين التفاعل مع عناصر select
        select.addEventListener('change', function() {
            // إزالة التركيز بعد الاختيار لتجنب مشاكل العرض
            this.blur();
        });
    });
}



// Load app data on page load
document.addEventListener('DOMContentLoaded', () => {
    // تحميل البيانات من JSONBin أولاً
    loadFromJSONBin().catch(error => {
        console.error('فشل تحميل البيانات من JSONBin:', error);
    });
    
    // ثم استمر في باقي الكود الحالي
    loadAppData();
    setupEventListeners();
    enhanceSelectElements();

    // تعيين سرعة الاستيراد الافتراضية إذا كانت محفوظة
    const defaultSpeed = localStorage.getItem(STORAGE_KEYS.DEFAULT_IMPORT_SPEED);
    if (defaultSpeed) {
        const speedRadio = document.querySelector(`input[name="import-speed"][value="${defaultSpeed}"]`);
        if (speedRadio) speedRadio.checked = true;
    }

    // تعيين حالة الحفظ التلقائي لسرعة الاستيراد
    const autoSaveCheckbox = document.getElementById('auto-save-speed');
    if (autoSaveCheckbox) {
        autoSaveCheckbox.checked = localStorage.getItem('autoSaveImportSpeed') === 'true';
        autoSaveCheckbox.addEventListener('change', () => {
            localStorage.setItem('autoSaveImportSpeed', autoSaveCheckbox.checked);
        });
    }

    // Add event listeners for the clean names modal
    document.getElementById('start-cleaning-btn').addEventListener('click', () => {
        const categoryId = document.getElementById('clean-category-id').value;
        const wordsToRemove = document.getElementById('words-to-remove').value;

        if (!categoryId) {
            showToast('حدث خطأ في تحديد القسم', 'error');
            return;
        }

        if (!wordsToRemove.trim()) {
            showToast('يرجى إدخال كلمات للحذف', 'warning');
            return;
        }

        cleanMovieNames(categoryId, wordsToRemove);
        document.getElementById('clean-names-modal').classList.remove('show');
    });

    document.getElementById('cancel-cleaning-btn').addEventListener('click', () => {
        document.getElementById('clean-names-modal').classList.remove('show');
    });

    document.querySelector('#clean-names-modal .close').addEventListener('click', () => {
        document.getElementById('clean-names-modal').classList.remove('show');
    });

    document.getElementById('clean-names-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('clean-names-modal')) {
            document.getElementById('clean-names-modal').classList.remove('show');
        }
    });
});

// Generate unique ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// التحقق من وجود فيلم مكرر
function isDuplicateMovie(name, href, category) {
    // التحقق من وجود الاسم والرابط معاً في نفس القسم
    if (category === 'series') {
        return appState.series.some(item =>
            (item.name === name || item.href === href) &&
            item.category === category &&
            !item.hidden
        );
    } else {
        return appState.movies.some(item =>
            (item.name === name || item.href === href) &&
            item.category === category &&
            !item.hidden
        );
    }
}

// فتح مودال تعديل الفيلم
function openEditModal(item) {
    const modal = document.getElementById('edit-movie-modal');
    const nameInput = document.getElementById('edit-movie-name');
    const imgInput = document.getElementById('edit-movie-img');
    const hrefInput = document.getElementById('edit-movie-href');
    const categorySelect = document.getElementById('edit-movie-category');
    const starNameInput = document.getElementById('edit-star-name');
    const starNameGroup = document.getElementById('edit-star-name-group');
    const idInput = document.getElementById('edit-movie-id');

    // تعبئة البيانات في النموذج
    nameInput.value = item.name || '';
    imgInput.value = item.img || '';

    // التعامل مع اختصارات المواقع
    if (item.isSiteShortcut) {
        hrefInput.value = item.href || item.url || '';
        // إخفاء خيار تغيير القسم للاختصارات
        categorySelect.style.display = 'none';
        categorySelect.previousElementSibling.style.display = 'none';
        categorySelect.value = 'movie-sites';
    } else {
        hrefInput.value = item.href || '';
        categorySelect.style.display = 'block';
        categorySelect.previousElementSibling.style.display = 'block';
        categorySelect.value = item.category || '';
    }

    idInput.value = item.id;

    // إظهار/إخفاء حقل اسم النجم
    if (item.category === 'stars' && !item.isSiteShortcut) {
        starNameGroup.classList.remove('hidden');
        starNameInput.value = item.starName || '';
    } else {
        starNameGroup.classList.add('hidden');
    }

    // تحديث خيارات الأقسام
    updateCategorySelectOptions();

    // عرض المودال
    modal.classList.add('show');

    // إعداد التظليل التلقائي لجميع خانات الإدخال
    setupAutoSelectInputs(modal);

    // تظليل خانة اسم الفيلم تلقائيًا
    nameInput.focus();
    nameInput.select();

    // زر حفظ التغييرات
    document.getElementById('save-edit-btn').onclick = saveEditChanges;

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            createModalScrollbar(modalContent);
            console.log('✅ تم إضافة شريط التمرير لنافذة تعديل الفيلم');
        }
    }, 100);

    // زر إلغاء
    document.getElementById('cancel-edit-btn').onclick = () => {
        modal.classList.remove('show');
    };

    // إغلاق المودال عند النقر على X
    modal.querySelector('.close').onclick = () => {
        modal.classList.remove('show');
    };

    // إغلاق المودال عند النقر خارجه
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    };
}

// حفظ التغييرات بعد التعديل
function saveEditChanges() {
    const modal = document.getElementById('edit-movie-modal');
    const nameInput = document.getElementById('edit-movie-name');
    const imgInput = document.getElementById('edit-movie-img');
    const hrefInput = document.getElementById('edit-movie-href');
    const categorySelect = document.getElementById('edit-movie-category');
    const starNameInput = document.getElementById('edit-star-name');
    const idInput = document.getElementById('edit-movie-id');

    const name = nameInput.value.trim();
    const img = imgInput.value.trim();
    const href = hrefInput.value.trim();
    const categoryId = categorySelect.value;
    const id = idInput.value;

    if (!name) {
        showToast('يرجى إدخال اسم الفيلم/المسلسل', 'warning');
        return;
    }

    // البحث عن العنصر أولاً للتحقق من نوعه
    const tempItem = findMovieById(id);

    if (!categoryId && (!tempItem || !tempItem.isSiteShortcut)) {
        showToast('يرجى اختيار قسم', 'warning');
        return;
    }

    // البحث عن العنصر المراد تعديله
    const item = findMovieById(id);

    if (item) {
        // حفظ القيم القديمة للتحقق من التغييرات
        const oldCategory = item.category;
        const currentPage = appState.currentPage; // حفظ الصفحة الحالية

        // التعامل مع اختصارات المواقع
        if (item.isSiteShortcut && typeof item._shortcutIndex !== 'undefined') {
            const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
            if (movieSitesCat && Array.isArray(movieSitesCat.shortcuts) && movieSitesCat.shortcuts[item._shortcutIndex]) {
                // تحديث اختصار الموقع
                movieSitesCat.shortcuts[item._shortcutIndex].name = name;
                movieSitesCat.shortcuts[item._shortcutIndex].url = href;
                if (img) {
                    movieSitesCat.shortcuts[item._shortcutIndex].img = img;
                }
            }
        } else {
            // تحديث البيانات للأفلام والمسلسلات العادية
            item.name = name;
            item.img = img;
            item.href = href;
            item.category = categoryId;

            // تحديث اسم النجم إذا كان القسم هو "أفلام النجوم"
            if (categoryId === 'stars') {
                item.starName = starNameInput.value.trim();
            }

            // إذا تم تغيير القسم من/إلى المسلسلات
            if (oldCategory !== categoryId) {
                if (oldCategory === 'series' && categoryId !== 'series') {
                    // نقل من المسلسلات إلى الأفلام
                    appState.series = appState.series.filter(series => series.id !== id);
                    appState.movies.push(item);
                } else if (oldCategory !== 'series' && categoryId === 'series') {
                    // نقل من الأفلام إلى المسلسلات
                    appState.movies = appState.movies.filter(movie => movie.id !== id);
                    appState.series.push(item);
                }
            }
        }

        // حفظ البيانات وتحديث الواجهة
        saveAppData();
        updateCategoriesCounts();
        renderCategories();

        // إذا تم تغيير القسم، عرض القسم الجديد
        if (oldCategory !== categoryId && appState.currentCategory !== 'all') {
            displayMovies(categoryId, 1); // الانتقال للصفحة الأولى في القسم الجديد
        } else {
            // إذا لم يتغير القسم، حافظ على الصفحة الحالية والموضع
            const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            displayMoviesWithoutScroll(appState.currentCategory, currentPage);

            // استعادة موضع التمرير بعد تحديث الواجهة
            setTimeout(() => {
                window.scrollTo(0, currentScrollPosition);
            }, 50);
        }

        // إغلاق المودال
        modal.classList.remove('show');

        showToast(`تم تحديث "${name}" بنجاح`, 'success');
    } else {
        showToast('لم يتم العثور على الفيلم', 'error');
    }
}

// Setup manage movies tab
function setupManageMoviesTab() {
    // Update category select options
    updateCategorySelectOptions();

    // Get filter elements
    const filterCategory = document.getElementById('filter-category');
    const filterSite = document.getElementById('filter-site');

    // Initially populate the site filter based on the default category
    populateSiteFilter(filterCategory.value);

    // Update site filter when category changes
    filterCategory.addEventListener('change', () => {
        populateSiteFilter(filterCategory.value);
        displayManagedMovies();
    });

    // Update display when site filter changes
    filterSite.addEventListener('change', () => {
        displayManagedMovies();

        // Show/hide site actions based on whether a site is selected
        const siteActions = document.getElementById('site-actions');
        if (filterSite.value) {
            siteActions.classList.remove('hidden');
        } else {
            siteActions.classList.add('hidden');
        }
    });

    // Site action buttons
    document.getElementById('move-site-movies').onclick = moveSiteMovies;
    document.getElementById('delete-site-movies').onclick = deleteSiteMovies;
    document.getElementById('hide-site-movies').onclick = hideSiteMovies;

    // Display the movies
    displayManagedMovies();
}

// Populate site filter dropdown based on selected category
function populateSiteFilter(categoryId) {
    const filterSite = document.getElementById('filter-site');
    const currentValue = filterSite.value;

    // Clear options
    filterSite.innerHTML = '<option value="">جميع المواقع</option>';

    // Get all unique sites from the movies in the selected category
    const sites = new Set();

    let items = [];
    if (categoryId === 'all') {
        items = [...appState.movies, ...appState.series];
    } else if (categoryId === 'series') {
        items = appState.series;
    } else {
        items = appState.movies.filter(movie => movie.category === categoryId);
    }

    items.forEach(item => {
        if (item.href) {
            try {
                const site = getSiteFromUrl(item.href);
                if (site) sites.add(site);
            } catch (e) {
                // Ignore invalid URLs
            }
        }
    });

    // Add options with movie count (sorted alphabetically)
    const sitesArray = Array.from(sites).sort();
    sitesArray.forEach(site => {
        // Count movies for this site
        let movieCount = 0;
        items.forEach(item => {
            if (item.href) {
                try {
                    const itemSite = getSiteFromUrl(item.href);
                    if (itemSite === site) {
                        movieCount++;
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            }
        });

        const option = document.createElement('option');
        option.value = site;
        option.textContent = `${site} (${movieCount} عنصر)`;
        filterSite.appendChild(option);
    });

    // إذا لم تكن هناك قيمة محددة مسبقاً، اختر الموقع الأول تلقائياً
    if (currentValue && Array.from(filterSite.options).some(opt => opt.value === currentValue)) {
        filterSite.value = currentValue;
    } else if (sitesArray.length > 0) {
        // اختيار الموقع الأول تلقائياً
        filterSite.value = sitesArray[0];
        // تحديث العرض بناءً على الفلتر الجديد
        setTimeout(() => displayManagedMovies(), 100);
    }
}

// Display movies based on filters
function displayManagedMovies() {
    const filterCategory = document.getElementById('filter-category');
    const filterSite = document.getElementById('filter-site');
    const container = document.getElementById('movies-management-list');

    const categoryId = filterCategory.value;
    const site = filterSite.value;

    // Clear container
    container.innerHTML = '';

    // Get filtered items
    let items = [];
    let folders = [];

    if (categoryId === 'all') {
        items = [...appState.movies, ...appState.series];
    } else if (categoryId === 'series') {
        items = appState.series;
    } else if (categoryId === 'movie-sites') {
        // إضافة المجلدات والمواقع لقسم مواقع الأفلام
        const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
        if (movieSitesCat) {
            folders = movieSitesCat.folders || [];
            items = movieSitesCat.shortcuts || [];
        }
    } else {
        items = appState.movies.filter(movie => movie.category === categoryId);
    }

    // Apply site filter
    if (site) {
        items = items.filter(item => getSiteFromUrl(item.href || item.url) === site);
    }

    // عرض المجلدات أولاً إذا كان القسم هو مواقع الأفلام
    if (categoryId === 'movie-sites' && folders.length > 0) {
        const foldersSection = document.createElement('div');
        foldersSection.className = 'folders-management-section';
        foldersSection.innerHTML = '<h4 style="color: #333; margin-bottom: 15px;"><i class="fas fa-folder" style="color: #ffa726; margin-left: 8px;"></i>المجلدات</h4>';

        folders.forEach(folder => {
            const folderCard = document.createElement('div');
            folderCard.className = 'manage-folder-card';
            folderCard.innerHTML = `
                <div class="manage-folder-header">
                    <div class="folder-info">
                        <i class="fas fa-folder" style="color: #ffa726; margin-left: 10px; font-size: 1.2em;"></i>
                        <span class="folder-name">${folder.name}</span>
                        <span class="folder-count">(${folder.sites ? folder.sites.length : 0} مواقع)</span>
                    </div>
                    <div class="folder-visibility">
                        <label class="visibility-toggle">
                            <input type="checkbox" ${folder.hidden ? '' : 'checked'} onchange="toggleFolderVisibility('${folder.id}', this.checked)">
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">${folder.hidden ? 'مخفي' : 'ظاهر'}</span>
                        </label>
                    </div>
                </div>
                <div class="manage-folder-actions">
                    <button class="manage-folder-edit" onclick="renameFolderFromManagement('${folder.id}')">
                        <i class="fas fa-edit"></i> إعادة تسمية
                    </button>
                    <button class="manage-folder-delete" onclick="deleteFolderFromManagement('${folder.id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                    <button class="manage-folder-view" onclick="showFolderContents('${folder.id}')">
                        <i class="fas fa-eye"></i> عرض المحتوى
                    </button>
                </div>
            `;
            foldersSection.appendChild(folderCard);
        });

        container.appendChild(foldersSection);
    }

    // Display a message if no movies found
    if (items.length === 0 && folders.length === 0) {
        container.innerHTML = '<div class="no-items">لا توجد عناصر تطابق المعايير المحددة</div>';
        return;
    }

    // إضافة قسم المواقع إذا كان هناك مواقع
    if (items.length > 0) {
        const sitesSection = document.createElement('div');
        sitesSection.className = 'sites-management-section';
        if (categoryId === 'movie-sites') {
            sitesSection.innerHTML = '<h4 style="color: #333; margin: 20px 0 15px 0;"><i class="fas fa-external-link-alt" style="color: #b97cff; margin-left: 8px;"></i>المواقع في القائمة الرئيسية</h4>';
        }
        container.appendChild(sitesSection);
    }

    // Display the movies
    items.forEach(item => {
        const movieCard = document.createElement('div');
        movieCard.className = 'manage-movie-card';

        const imgFilename = getImageFilenameFromUrl(item.img);
        const imgSrc = appState.cachedImages[imgFilename] || item.img;

        movieCard.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="manage-movie-image" onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFFmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDg4LCAyMDIwLzA3LzEwLTIyOjA2OjUzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjIuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIzLTExLTIxVDE4OjU1OjM0KzAzOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMy0xMS0yMVQxODo1NjozNCswMzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMy0xMS0yMVQxODo1NjozNCswMzowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowZWJlOWYxYy1mYmUwLTk3NDAtYmZlZC1lZmU4NWQ5MGU2YjEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MGViZTlmMWMtZmJlMC05NzQwLWJmZWQtZWZlODVkOTBlNmIxIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6MGViZTlmMWMtZmJlMC05NzQwLWJmZWQtZWZlODVkOTBlNmIxIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDowZWJlOWYxYy1mYmUwLTk3NDAtYmZlZC1lZmU4NWQ5MGU2YjEiIHN0RXZ0OndoZW49IjIwMjMtMTEtMjFUMTg6NTU6MzQrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMi4wIChXaW5kb3dzKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7sXM3XAAAThElEQVR4nO3deXAUV34H8O/r7pFG94F0IAlJSEhgMGdjYoONbXx4DTa+4tjYju1kceBXVbLrPzZVqd1N1ZbLOVJV2U1VOaecjeONj/jCBzY+AAMxBmMw2AavDUhCAgkJ3dJoNJrR9Ky7f+yOPJKm5/UxI81of59/YM309LzRefX79X7vvdckhIBAMlw5U4EQvQu3v6wd4/X75sIYLojJjSGtJgAQUsMgzQUCWUyQzGYiXTbpxoKYDJiWNBebOZnpQXpdP6g6BlIdhlsZBz0/ClIdB70whjAwAJMAQIFgZdyQbA5IZb6Qy+sBgxxJLrGS3GJwpW3h9lYKVH2TZH87pXKqAuiBfoh4lkFgAWCsAWF2n4zS8ZUgS7dFqgMXCKNKIOYV1MKCBX9qM/2Hef/jPkz7EzG04c9k3V29jSzLI0IINJq1XGk7+Y3WFTEpEMZVP5sI7xvywnt3/WZ7l8RBQ/3+Tw0+tQYG1bJB7vA21H8QR/dPgxzM3w+E/5XBU7rNwlOEEPD5fAgEAqxj0rJv/eK/vv0L0Rt4O9lglENYqnQXPSYQxlGTnX3x2GvP+L2+mQBgNBphNBrj+9ZxwBgDQghjrRqndUdJ5zO/ZMi69YbonhxVUlxTLK60tfiX//5lj8c7C0A4iTNgP1I///KMH/wA4wXRnmyJKIglnPsefuRtj9c7E4iW5BTxbuvqo5+07fjN8D+9eS/I3vFXxjnFEUQge/7Vr10Yd8oLAArX/q/Qhp1j1wV/psDk7f6D+OAD80T3ZDJEFEQzrCwKzDqvzwdLdZObTxv/FXyFYRjQLPULLj75VxPds0lJZbWomQghjGlVrb15mz7t3P7OYMKvTX6RYWPZp2D4i4xsQvrC4Clo+jHIvqm1HBYxUYUXKhzJKZSUl1I3ORtTx8EZQ1CLa9W2h18Y723/sDzcFrzFvzBTQcRElkrpwwuMUWnHj78aWIZI3+GiuUqkpaTc/nHnP51YIpoTI04bR1JG2uM3Ii1cprRaSxYxlj2t/dEdU+PMkmJLY4pBcWrDnw9tu0v+9sbP5RcWrAx/YGYCGUMWz/kJ3nxlqPDLCscnb+8/lNRji2gSiTrqB5N9wk3lxw3H3nQP23sM0S/wG/AcXXUuq8Yw5M8q3V99ecnK8mIb96KAx+MBpRRM5vWQmZAZk8/hGXLCM9QBn88HWWYxC45zDXmvs9bNL+XEtQHJYLJ4Tt+O3XmlfpDLK7L91kGu27fAGUe6YfQgqtfbDZIERFwc9Xq94IzD6rzZuHz4PERFx3Xj3fdfHNnSXFBclEeW3XA+J9kx4sFhx1X4fb643zfZTPuBFzVtpQ+qjlwXdtMOEH+NzQHiiQFNQEjScvWdHaEO9Afc09kMuM77H/vQOi0Ljmd2tg+XzlkAxWqGYrVEfCi3e6BkWXgC/U6Qeip+yz3eCGwGrAWVYIGskLKiXGMYXTbS1nBHXM4/mU3bjFjBRdRGFc9hYw6TDSyc75FsRXAGBnQdQ/E5QQEwz8gIxJyKQTu1dYbfx6FaiqAo+jqb5hoGY4xihm5BqIqIOhvWQjGSfB4BYHpuCa7DmTAzAGPOdqZ6+oKOm7dOqmo7z6uJfAwG+G6WZ1SsMU9fYWcyiJpGJZRQUh84ZwPxNBuuKoXQ5WsYAZKkmBijjDErUaQaLrkuDtcHIHccZBDCQEQxVslKTVCSTYpAeMY45eLZlLOZcUE4XFMLpscwRLa/RK8jmmtOhWLJPRfJZinOiucgLLkEwQEQpwNQ1XGvZRWlTvIMiDgDgoawqgPjKyIzGm4fDfLDsWr35D3WVKwhhLQhzhtEnINzDogJfJF0JhBSCnCBDGMQJEiSNPBJVamNcw6O5BIEBzgbBWVpMB24EvFmSYQMIx0rF/0+rZTRQMCnQB7nFWOKSPIgLYQUTmcQJdNoNNoIId38lYNDUNJLEEKAqz5wrqLMVHQx0o2SCBnGVcfytEqjLRAIgDFe7w34q8AbEvTULxwCIh5AMuSs5OA3R7pREiFDBfQaxkwGA0wmE9wez7BAz3wPZJsnhjWIBNLBQJk5Yt+M6uo2zixQu5Zy5u9K3puPoxSTRNChz2KY0WgEZwxDw8MGrx9nWPvUc/qfYpJJBJJjUHvmDUXcW46nFJNEyPbfdRjm7e7udXg8nkw/7zWbDdIkiQIiJJQe0ULI+IlGPFhWURo4derMOxcuXtz55fnz/zvIhm2WbOnlRnSRdJNtuhWHcUGm75MPMNLkiGiZJN5STBIhDIBVr+F8fr+3qqrqB5s2bfpy3rx5V77+6h9e2rr1j9eOHDlSHgicVZMkCpFMk2USNyBHHJ04f6EGUPYCyEzZOCZRGgVJlkDQXlBkHDx4cGF+fv57DQ0NG1asWKFtb3xj3/79++taWlok1RdQOQdBIwuQeiGQCRFEMqyHZ/vu3edOnDjxcnl5+e76+vqe8FG3bt0yvfbaa/Vv//HtvV1dXa/5fL4l4QuxohJJWRCZOJYAGFVeWHXxxMmTr50+ffqV2traK3V1dUOrV68e2Lx582X42uLWgXDZqNfrra2trd22f//+J44dP77E4XA8MTE/inxm5nABoCCgBsBQlM/feWeeedb3Hn7ooYdOzJ8/35PIAWVZNlitVnHt2rWG48eP/x0hJEOSpODcIlm6bAmxRX7mTChxNY4xRhhjtKOzM/fYsWPfPX369K9qa2t7Ghoaro0sRTweT4HX650TXCQNP9XkiALJsCZWPFJMEjFxBjDIJpAfnDWwDOeOHcuorKzM6O3trdy1a1fl1q1bgw+YdXZ2Wmw2W20wHBEBiSQwzpFEWZaoqqpQVRVut7vE6/VWJenPvE+eIecbMplxpwk2Q2qFzZjCJ3DxWRyNuJBLZYn3egmVJIm7XC4wxtDe3l7icDjq4/YBM4jIh1i7BdUJrnGfKDHCvZ3DpQlMQCdCn3e0lJ0uGWMZU2OprKzMOzg4CLI5AJGMMmlCYOusMpQmXfNx5NJzSgcDHjnD6jFlQbTpXRWXZTnw+uuvV7rdbomfMYoMLMZqCPV5i93dXacXL168J08x2xOc8z5Pf/5MK8uQZTl/Yr/xzCMIITnJdXnxdwU8jHe3FW5vbVuaxZDuljkmZIFPCg+J9JRIlkmiT0glI7FspqeVqDY44jKJJ7CZUx1kkohPRdSR2oMBoyf1ZlR66KmWuF7DU2Jx7/4UY0tkk7wkkiXiNANKFXWmdwuE8+4nJIk3lhBaKSbYJB73SzE6Lto4kEyTbZIlGHDFddTa3taa8BO+UkyyRTJN0mTDI4u2GNfOmcFAxiLRB55qUU2iSZ5glP4gy/iXRnIFE5/DkzkYMEAqL81tEv2Ub9Eqnp6TKZgbxI8jGUaTAKLRNCMWTZwmpNSaRMMnUK54kmyp0SsVL02xQOxGdTgYSP7pQCJUKfUEI1UvDacCQU2yRU4yPZM8wcMTvA5i4iIiU0owiUi1SbxI/DmyyM4xB4MBBKL/fKsUk0pSbRJHckdiZz9O7DlixYJaMzpSbdIvfDyLj2T3eYLHEVd6YnNEptbBgEl8UvXSpHRB/GySbJIOw4DqidmRJlUv/hLIR0PxmcSj1oREqjXJlGizJRcNFqaYcJEmTSBzrLz3dRYf87qTQSofLkymSbdAHkh3n0pkoztZJnmC4bnG5b7AeWE+7hhsQWaiWpNnkidIXCSn2Xyn2e2T7ZlYiZCqM+XUFEv061ScqZ6s1VAdEzz9SpVrqliOeUFsRnX4K+N8+PVkeDbRe7N8UE/YQcRwZKgJLk5MsUQnRUSCWYxsNCNPCe/p2m7eGmg3Ked0zzYTYNIEIsn8/YFMnrqRRJOpEjEqfqKWC/xCYECKdXJNnkDK7L575g6y0dRziNxKCMCqovv8Rx7FkphgFJXZe8fK5XO/i+stKIk9RJSkn5rNhPIuD2g2STyOMplkKU4U62xDsU6mSVzEGhO8MXgB1mBWnADdIsMD1tJmoBKQ+n+tZFJQWBw02gONNRaOZxwrAZ1T9AQkEJlJPCECQYQoIHRzxR7Hu3YpbkwxnEGofEySAMHVCpEihQgkAaU2owuAiDsWBSB+CKODNgqIRLxzCr0QM6lYn4PEEZ+CnkZWQl4miBcixmVTBLklSYqGAiJO78LdSFWKAiLuPkUBkSXaD4Ak1lMUEHHRxobYC5uRwipFMIV4EpGaWIgFYkFFEAgNPzkCKcZXKoYnoO7bA6YeRCBjEK9GGcPJcW/bCxPjO+PL5AMCN4Lhiix2cR+IeD2KZRL3fZtxb9tzrkhHieGDtcRqUCwC4UiVRFKpvYWYIR5HFH22ot6OJdaL44VYcRPrRfFCrLiJBQ+xOOJ2vBThQWC80EZiX6JEiDEMEWMwwRQrF9iCCKZcgQM3FUmVIjWlSjhGsQWfWH8KBmKE3g+5TDwbEjOOJ4BHDqOIxUcSN68oDiaWQuIpFr9QGBPzCaKncE5I7P6CiKzQCBwn1n3ixpjiC4J6EXqZeC7U62BBsV4sEANixp/zJUAsoTXVjPOVCFOv+xQFRFxcJNLEkjg1MV6mHkQshaQn8TxiCZJKh6YYbUm8DylG/zHECkmxKG601aBUjhFH0RMWK0p6SrQYj05KnlIUEPFNe4Fi5ZB4dBFTLH2JX0QR9SADM43CcEIcQ+iDRLb5USxlIomcQ+i77wvE/1rCI9nQlHvxRPfK7lNUL+KpbMolokeMw4rTTi/c0YSOI/RAPY+I3U9+SZJiyiWiS4QcQo8YJwARG0vsOOJFCnGUvAGJWL/SOyS58jQFwN9BwlXX5D5nODuxPaZcOV0oPDX7ExX9rRxO1L1LnEHiJp7dXfS7Wk6EcR/2gA4/WvvGnTk3b1KeNIFTzqjT8+fRdcNQXxGE4B+K9bRRJFw7DWNaFicm/xRL/MRSLnGOeRxD5BghD6JiCpCiShHD94ZIi9Xxi7VTvdYk1g0iBJCDM9FFthAQK0ZCBCJrR4OIv4JUY++fiV8UEPFEUa2RiKWFeNkRO4JYbyH6RrFCRNu96U2smxMtJIIo9gARD6J3MBlDrL+M6OJ6xHv6Pp+IliWQGIdCJdoZCBFP8VYEzgc0nXFiTx2F3qQECRDJ1XEiXliP4fWoUi5E/4cCFUdNzZVU4wDuiHUAURrEJ0FQNLNvpfIEpYg03yY3TrF06oQkVSwFiXW2YiqHyDBifWWiRo2rD0/GdQlRnehxuoxYl0gUYgURWYTVTuJ8pY1oc0s0gXQ7QCyn6iFeJBZLbdEYhRQQ66kYo4jfDaSQQoRIIrRNPQVWA5IQ4t1fpJmfVIFMDPE+ThyEHEfGGFnHCOlXpATJNOLdXyQfhGzHtNYXE+1ZU2S8RPuImKMr0kEiDqIjiOiLiGEjcbMUcRAiLpO7TKRA2LE0iiX+F/FgJBZDpDGKP9HSp7UrMDnGk7KW7kcxYuguLt5/x7wkrLOLFEdbCfIpxmwUZ2JlRtyJpmCia+uqW0fiBoA0KiTq4iUm4o2iWbwsFHEQ3S4gdnCRnrEUxbFGXUX8CmNXiY4VrUbR7QLxQtdIRJNLBFFfJO7nFDtRzOsSwRiWxXHnmCMJnUjLv0VOJFIirCnGcBSxFmJNLOIHTOibETuRSPLpM8VKgghj6L55iIxDyEHEUpnoWOJzCpFjJHIQ0QOIvWn0DYbXL5JJIpXCU1SERPyB0Lnj2c5rg4oExKxxOEX/WVBcJtouJF61/IXEn+QdFIMoN6+1rccaiGZxTfVE4qYY1YxYVxB9UZwKIp4Eo7rEJMB44WCa1tC6eSBE6hMp5SSsRogExJrYp4i8a+QBJRpBrBdEBtFiYrQFQzF0Fy9AxBfEHEfMV9FSIgYxHj5OxAW0tBtRh1Bh0hP/qNnEQ7RWRc4Rj9cjRorpHFO0fBJ9idZbiJrq2YJoNbREE07T9x0rKmLJRPQ4sSyc8KJDJLmMGZbFwNpuK0mNURMXK0i0nmIpRLxoaP09YgixpjFe0I4aSeRMoknnSXWImCvEumyYGCTeV8SDXCGapPHoFovdnDGKJqRYBRk1hpZ4tQwr+iPRs8bheOK9Yjy2q9jZJGEDRD6O+BzC3Df2l9Tnp4rVnEQ6JdH6EeOYAolmvIBTbBJBvAWQeJHtMVJXFVAZxitG0WsYsb4xnpBLw4Uh2jxjVcZYXxJJcZq2ixVZG6JVLDVMumRBPIlFBNHmVKSYxDymWKWMRSJNKS0HESVSRROdjYjOtBS9QCCGFWRYxikgcfEYC0s04yVBJCmMJ9ZnxRIpRLStRULHgA5JH7M0aXkvoilZxBq/1hOJlTaR5jFexfAUQqxFkagRS75YRtBSlzB2/WptEBe7NqK/x3UG4b4w7rHG+z6dJFIxPMWSJRHJMHk/RSLJEbMNEiuB6MViHUSHI8QSTCvjHDaW9yMZQfR142VzHPpkpAtPphjjJd2koUNGR5poMWsVy59a4x5TrLJqoXVuiWS9OC41iDZ6NRBZtIwY3EuXE4gfQWvHiiTiMUIK5L7xRZIhWS+euBpEIopY04iUHuM1EZ0qSrxShyiJRRRnGo8V09gk69fiYi4sRZlixTOZ70YSK0aDGMdO5lvHoVPSxNMhYkknmkzjNd7QUiLJNC5NrJilE/F+Hl5O4reSWCWTuB1B7BhTrGeJOxMtJjyJRd+k1thS4eRj0rPjaJkYxUVsIkXsXKGGkRCpYFqK1L5Ep2uJTHZ1mnRXEj2RaFLq0DyS6nGxJ3lHXa5JxpjiUohOxFxbp4MnpXsRCRBPBNG5kpZnxPmqOBRSDxEMEGsL4+WKpiTU5fzx7JjGO67IBOg0J4pnQ0nGv8F4l2VCnzcuCRf3KZfI6/RoMmLJN6lfJZ1MuROJdMcUq1SRxDWh9CJ+klS4BKJiyfQnJlYUTWL5N5IYPn8ijx03cS1Wxjn4RDcXTZpUbSOxnhq1LItx22QUSyHiPXS8lJ3Qgqq4RJKy3p8MkwH0OYjWsixF+FPiR8QpRSXLRJj83+0UE5pIE1bnCcKUbTIj+VNmOWqGEhN7RkvMx5rkpuKnx0BvxLPQx3pcHCXrhKFT5pzI9ZK79w8wNaZ6kyZF8vwJpnIdIcXkJJYU/w9+9NbK91HafwAAAABJRU5ErkJggg=='">
            <div class="manage-movie-details">
                <h4>${item.name}</h4>
                <p>القسم: ${getCategoryName(item.category)}</p>
                <p>الموقع: ${getSiteFromUrl(item.href) || 'غير محدد'}</p>
            </div>
            <div class="manage-movie-actions">
                <button class="manage-movie-play" data-href="${item.href}" title="تشغيل الفيلم">
                    <i class="fas fa-play"></i> تشغيل
                </button>
                <button class="manage-movie-edit" data-id="${item.id}">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="manage-movie-delete" data-id="${item.id}">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        `;

        // إضافة البطاقة إلى القسم المناسب
        if (categoryId === 'movie-sites') {
            // تخصيص عرض المواقع
            if (item.url || item.href) {
                movieCard.innerHTML = `
                    <div class="manage-site-icon">
                        <i class="fas fa-external-link-alt" style="font-size: 2em; color: #b97cff;"></i>
                    </div>
                    <div class="manage-movie-details">
                        <h4>${item.name || item.title || item.url}</h4>
                        <p>الرابط: ${item.url || item.href}</p>
                        <p>الموقع: ${getSiteFromUrl(item.url || item.href) || 'غير محدد'}</p>
                    </div>
                    <div class="manage-movie-actions">
                        <button class="manage-site-edit" data-index="${items.indexOf(item)}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="manage-site-delete" data-index="${items.indexOf(item)}">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                        <button class="manage-site-visit" data-url="${item.url || item.href}">
                            <i class="fas fa-external-link-alt"></i> زيارة
                        </button>
                    </div>
                `;
            }

            const sitesSection = container.querySelector('.sites-management-section');
            if (sitesSection) {
                sitesSection.appendChild(movieCard);
            } else {
                container.appendChild(movieCard);
            }
        } else {
            container.appendChild(movieCard);
        }
    });

    // Add event listeners to the play, edit and delete buttons
    document.querySelectorAll('.manage-movie-play').forEach(button => {
        button.addEventListener('click', () => {
            const href = button.dataset.href;
            if (href) {
                window.open(href, '_blank');
            }
        });
    });

    document.querySelectorAll('.manage-movie-edit').forEach(button => {
        button.addEventListener('click', () => {
            const itemId = button.dataset.id;
            const item = findMovieById(itemId);
            if (item) {
                openEditModal(item);
            }
        });
    });

    document.querySelectorAll('.manage-movie-delete').forEach(button => {
        button.addEventListener('click', () => {
            const itemId = button.dataset.id;
            const item = findMovieById(itemId);

            if (item) {
                // Show confirmation modal
                const modal = document.getElementById('confirm-modal');
                const messageElement = document.getElementById('confirm-message');

                messageElement.textContent = `هل أنت متأكد من رغبتك في حذف "${item.name}"؟`;

                // Show the modal
                modal.classList.add('show');

                // Yes button
                document.getElementById('confirm-yes').onclick = () => {
                    deleteMovie(itemId);
                    displayManagedMovies();
                    modal.classList.remove('show');
                };

                // No button
                document.getElementById('confirm-no').onclick = () => {
                    modal.classList.remove('show');
                };
            }
        });
    });

    // Add event listeners for site management buttons
    document.querySelectorAll('.manage-site-edit').forEach(button => {
        button.addEventListener('click', () => {
            const siteIndex = parseInt(button.dataset.index);
            editSiteFromManagement(siteIndex);
        });
    });

    document.querySelectorAll('.manage-site-delete').forEach(button => {
        button.addEventListener('click', () => {
            const siteIndex = parseInt(button.dataset.index);
            if (confirm('هل أنت متأكد من حذف هذا الموقع؟')) {
                deleteSiteFromManagement(siteIndex);
            }
        });
    });

    document.querySelectorAll('.manage-site-visit').forEach(button => {
        button.addEventListener('click', () => {
            const url = button.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
    });
}

// Move site movies to another category
function moveSiteMovies() {
    const filterCategory = document.getElementById('filter-category');
    const filterSite = document.getElementById('filter-site');

    const categoryId = filterCategory.value;
    const site = filterSite.value;

    if (!site) {
        showToast('يرجى اختيار موقع', 'warning');
        return;
    }

    // Create a modal to select target category
    const modal = document.getElementById('confirm-modal');
    const messageElement = document.getElementById('confirm-message');

    // Create category select
    let categoryOptions = '';
    appState.categories.main.forEach(cat => {
        if (cat.id !== 'all') {
            categoryOptions += `<option value="${cat.id}">${cat.name}</option>`;
        }
    });

    if (appState.showSpecialSections) {
        appState.categories.special.forEach(cat => {
            categoryOptions += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }

    messageElement.innerHTML = `
        <p>نقل الأفلام من موقع "${site}" إلى:</p>
        <select id="move-site-target-category" class="form-control">
            ${categoryOptions}
        </select>
    `;

    // Show the modal
    modal.classList.add('show');

    // Yes button
    document.getElementById('confirm-yes').onclick = () => {
        const targetCategory = document.getElementById('move-site-target-category').value;
        let movedCount = 0;

        // Move the movies
        appState.movies.forEach(movie => {
            if (getSiteFromUrl(movie.href) === site) {
                movie.category = targetCategory;
                movedCount++;
            }
        });

        saveAppData();
        updateCategoriesCounts();
        renderCategories();
        displayManagedMovies();

        modal.classList.remove('show');
        showToast(`تم نقل ${movedCount} فيلم من موقع "${site}" إلى قسم "${getCategoryName(targetCategory)}" بنجاح`, 'success');
    };

    // No button
    document.getElementById('confirm-no').onclick = () => {
        modal.classList.remove('show');
    };
}

// Delete site movies
function deleteSiteMovies() {
    const filterSite = document.getElementById('filter-site');
    const site = filterSite.value;

    if (!site) {
        showToast('يرجى اختيار موقع', 'warning');
        return;
    }

    // Show confirmation modal
    const modal = document.getElementById('confirm-modal');
    const messageElement = document.getElementById('confirm-message');

    messageElement.textContent = `هل أنت متأكد من رغبتك في حذف جميع الأفلام من موقع "${site}"؟`;

    // Show the modal
    modal.classList.add('show');

    // Yes button
    document.getElementById('confirm-yes').onclick = () => {
        const originalMoviesCount = appState.movies.length;
        const originalSeriesCount = appState.series.length;

        // Filter out the movies from the specified site
        appState.movies = appState.movies.filter(movie => getSiteFromUrl(movie.href) !== site);
        appState.series = appState.series.filter(series => getSiteFromUrl(series.href) !== site);

        // Calculate deleted count
        const deletedMoviesCount = originalMoviesCount - appState.movies.length;
        const deletedSeriesCount = originalSeriesCount - appState.series.length;
        const totalDeleted = deletedMoviesCount + deletedSeriesCount;

        saveAppData();
        updateCategoriesCounts();
        renderCategories();
        displayManagedMovies();

        modal.classList.remove('show');
        showToast(`تم حذف ${totalDeleted} عنصر من موقع "${site}" بنجاح`, 'success');
    };

    // No button
    document.getElementById('confirm-no').onclick = () => {
        modal.classList.remove('show');
    };
}

// Hide site movies
function hideSiteMovies() {
    const filterSite = document.getElementById('filter-site');
    const site = filterSite.value;

    if (!site) {
        showToast('يرجى اختيار موقع', 'warning');
        return;
    }

    // Show confirmation modal
    const modal = document.getElementById('confirm-modal');
    const messageElement = document.getElementById('confirm-message');

    messageElement.textContent = `هل أنت متأكد من رغبتك في إخفاء جميع الأفلام من موقع "${site}"؟`;

    // Show the modal
    modal.classList.add('show');

    // Yes button
    document.getElementById('confirm-yes').onclick = () => {
        let hiddenCount = 0;

        // Hide the movies
        appState.movies.forEach(movie => {
            if (getSiteFromUrl(movie.href) === site) {
                movie.hidden = true;
                hiddenCount++;
            }
        });

        appState.series.forEach(series => {
            if (getSiteFromUrl(series.href) === site) {
                series.hidden = true;
                hiddenCount++;
            }
        });

        saveAppData();
        updateCategoriesCounts();
        renderCategories();
        displayManagedMovies();

        modal.classList.remove('show');
        showToast(`تم إخفاء ${hiddenCount} عنصر من موقع "${site}" بنجاح`, 'success');
    };

    // No button
    document.getElementById('confirm-no').onclick = () => {
        modal.classList.remove('show');
    };
}

// Setup manage sites tab
function setupManageSitesTab() {
    // تحديث قائمة المواقع عند فتح التبويب
    populateSitesSelect();

    // إعداد قائمة المواقع المنسدلة
    const sitesSelect = document.getElementById('sites-select');
    const siteSearchInput = document.getElementById('site-search-input');

    if (sitesSelect) {
        sitesSelect.addEventListener('change', () => {
            handleSiteSelection();
            // تحديث حقل البحث عند الاختيار من القائمة
            if (siteSearchInput) {
                const selectedOption = sitesSelect.options[sitesSelect.selectedIndex];
                siteSearchInput.value = selectedOption.value ? selectedOption.text.split(' (')[0] : '';
            }
        });
    }

    // إعداد حقل البحث
    if (siteSearchInput) {
        siteSearchInput.addEventListener('input', () => {
            const searchTerm = siteSearchInput.value.toLowerCase();
            const options = sitesSelect.options;

            for (let i = 1; i < options.length; i++) { // ابدأ من 1 لتجاهل الخيار الأول
                const optionText = options[i].text.toLowerCase();
                if (optionText.includes(searchTerm)) {
                    options[i].style.display = '';
                } else {
                    options[i].style.display = 'none';
                }
            }
        });
    }

    // إعداد زر تحديث القائمة
    const refreshBtn = document.getElementById('refresh-sites-select');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if(siteSearchInput) siteSearchInput.value = ''; // مسح حقل البحث
            populateSitesSelect();
        });
    }

    // إعداد أزرار العمليات
    setupSiteActionButtons();

    // إعداد زر تنظيف المواقع المكررة
    const cleanupBtn = document.getElementById('cleanup-duplicate-sites');
    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من تنظيف المواقع المكررة في جميع المجلدات؟\nسيتم حذف المواقع المكررة نهائياً.')) {
                cleanupDuplicateSitesInFolders();
            }
        });
    }

    // إعداد زر عرض المواقع المخفية
    const showHiddenSitesBtn = document.getElementById('show-hidden-sites');
    if (showHiddenSitesBtn) {
        showHiddenSitesBtn.addEventListener('click', showHiddenSitesSection);
    }

    // إعداد زر إغلاق قسم المواقع المخفية
    const closeHiddenSitesBtn = document.getElementById('close-hidden-sites');
    if (closeHiddenSitesBtn) {
        closeHiddenSitesBtn.addEventListener('click', hideHiddenSitesSection);
    }

    // إعداد مودال العمليات الجماعية
    setupSiteBulkActionModal();
}

// تعبئة قائمة المواقع المنسدلة
function populateSitesSelect() {
    const sitesSelect = document.getElementById('sites-select');
    if (!sitesSelect) return;

    // الحصول على جميع المواقع مع عدد الأفلام لكل موقع
    const sitesData = getAllSitesWithCounts();

    // حفظ القيمة المحددة حالياً
    const currentValue = sitesSelect.value;

    // تفريغ القائمة
    sitesSelect.innerHTML = '<option value="">-- اختر موقعاً --</option>';

    if (sitesData.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'لا توجد مواقع متاحة';
        option.disabled = true;
        sitesSelect.appendChild(option);
        return;
    }

    // إضافة المواقع للقائمة
    sitesData.forEach(siteData => {
        const option = document.createElement('option');
        option.value = siteData.site;
        option.textContent = `${siteData.site} (${siteData.totalCount} عنصر)`;
        sitesSelect.appendChild(option);
    });

    // استعادة القيمة المحددة إذا كانت موجودة
    if (currentValue && sitesData.some(s => s.site === currentValue)) {
        sitesSelect.value = currentValue;
        handleSiteSelection(); // تحديث المعلومات
    } else {
        // إخفاء معلومات الموقع
        const siteInfo = document.getElementById('selected-site-info');
        if (siteInfo) {
            siteInfo.classList.add('hidden');
        }
    }
}

// معالجة اختيار موقع من القائمة
function handleSiteSelection() {
    const sitesSelect = document.getElementById('sites-select');
    const siteInfo = document.getElementById('selected-site-info');

    if (!sitesSelect || !siteInfo) return;

    const selectedSite = sitesSelect.value;

    if (!selectedSite) {
        siteInfo.classList.add('hidden');
        // إخفاء معلومات القسم أيضاً
        const siteLocationElement = document.getElementById('selected-site-location');
        if (siteLocationElement) {
            siteLocationElement.classList.add('hidden');
        }
        return;
    }

    // الحصول على بيانات الموقع المحدد
    const sitesData = getAllSitesWithCounts();
    const siteData = sitesData.find(s => s.site === selectedSite);

    if (!siteData) {
        siteInfo.classList.add('hidden');
        return;
    }

    // الحصول على معلومات موقع الموقع في قسم مواقع الأفلام
    const siteLocation = getSiteLocation(selectedSite);

    // تحديث معلومات الموقع
    document.getElementById('selected-site-name').textContent = siteData.site;
    document.getElementById('selected-site-url').textContent = siteData.site;
    document.getElementById('selected-site-movies').textContent = siteData.moviesCount;
    document.getElementById('selected-site-series').textContent = siteData.seriesCount;
    document.getElementById('selected-site-total').textContent = siteData.totalCount;

    // الحصول على بيان شامل بجميع الأقسام التي تحتوي على أفلام الموقع
    const comprehensiveSiteReport = getComprehensiveSiteReport(selectedSite);

    // تحديث معلومات القسم
    const siteLocationElement = document.getElementById('selected-site-location');
    if (siteLocationElement) {
        if (comprehensiveSiteReport && comprehensiveSiteReport.totalCategories > 0) {
            let locationHTML = `
                <p><strong><i class="fas fa-chart-bar"></i> بيان شامل - الموقع موجود في ${comprehensiveSiteReport.totalCategories} قسم:</strong></p>
                <div class="comprehensive-report">
            `;

            // إضافة قسم مواقع الأفلام إذا كان موجوداً
            if (comprehensiveSiteReport.movieSitesSection) {
                const section = comprehensiveSiteReport.movieSitesSection;
                locationHTML += `
                    <div class="report-section movie-sites-section">
                        <h4><i class="fas fa-external-link-alt"></i> قسم مواقع الأفلام</h4>
                        <div class="section-content">
                            <p><strong>الموقع:</strong> ${section.location}</p>
                            <p class="section-note">هذا الموقع مضاف كاختصار في قسم مواقع الأفلام</p>
                        </div>
                    </div>
                `;
            }

            // إضافة الأقسام التي تحتوي على أفلام/مسلسلات
            if (comprehensiveSiteReport.contentCategories.length > 0) {
                locationHTML += `
                    <div class="report-section content-categories-section">
                        <h4><i class="fas fa-film"></i> الأقسام التي تحتوي على محتوى من الموقع (${comprehensiveSiteReport.contentCategories.length} قسم)</h4>
                        <div class="categories-list">
                `;

                comprehensiveSiteReport.contentCategories.forEach(cat => {
                    const totalCount = cat.moviesCount + cat.seriesCount;
                    let typeIcon = '';
                    let typeText = '';

                    switch(cat.type) {
                        case 'main':
                            typeIcon = 'fas fa-folder';
                            typeText = 'قسم رئيسي';
                            break;
                        case 'special':
                            typeIcon = 'fas fa-star';
                            typeText = 'قسم خاص';
                            break;
                        case 'sub':
                            typeIcon = 'fas fa-folder-open';
                            typeText = 'قسم فرعي';
                            break;
                    }

                    locationHTML += `
                        <div class="category-item">
                            <div class="category-info">
                                <p><i class="${typeIcon}"></i> <strong>${cat.categoryName}</strong> (${typeText})</p>
                                <p class="category-stats">
                                    <span>أفلام: ${cat.moviesCount}</span>
                                    ${cat.seriesCount > 0 ? `<span>مسلسلات: ${cat.seriesCount}</span>` : ''}
                                    <span class="total">المجموع: ${totalCount}</span>
                                </p>
                            </div>
                            <div class="category-actions">
                                <button class="category-action-btn move" onclick="showCategorySiteBulkActionModal('${selectedSite}', '${cat.categoryId}', 'move')" title="نقل أفلام الموقع من هذا القسم">
                                    <i class="fas fa-exchange-alt"></i>
                                </button>
                                <button class="category-action-btn delete" onclick="showCategorySiteBulkActionModal('${selectedSite}', '${cat.categoryId}', 'delete')" title="حذف أفلام الموقع من هذا القسم">
                                    <i class="fas fa-trash"></i>
                                </button>
                                <button class="category-action-btn hide" onclick="showCategorySiteBulkActionModal('${selectedSite}', '${cat.categoryId}', 'hide')" title="إخفاء أفلام الموقع من هذا القسم">
                                    <i class="fas fa-eye-slash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });

                locationHTML += `
                        </div>
                    </div>
                `;
            }

            // إضافة ملخص إحصائي
            locationHTML += `
                <div class="report-section summary-section">
                    <h4><i class="fas fa-chart-pie"></i> ملخص إحصائي</h4>
                    <div class="summary-stats">
                        <div class="summary-item">
                            <span class="summary-label">إجمالي الأقسام:</span>
                            <span class="summary-value">${comprehensiveSiteReport.totalCategories}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">إجمالي الأفلام:</span>
                            <span class="summary-value">${comprehensiveSiteReport.totalMovies}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">إجمالي المسلسلات:</span>
                            <span class="summary-value">${comprehensiveSiteReport.totalSeries}</span>
                        </div>
                        <div class="summary-item total">
                            <span class="summary-label">المجموع الكلي:</span>
                            <span class="summary-value">${comprehensiveSiteReport.grandTotal}</span>
                        </div>
                    </div>
                </div>
            `;

            locationHTML += '</div>';

            siteLocationElement.innerHTML = locationHTML;
            siteLocationElement.classList.remove('hidden');
        } else {
            siteLocationElement.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> الموقع غير موجود في أي قسم</p>';
            siteLocationElement.classList.remove('hidden');
        }
    }

    // إظهار معلومات الموقع
    siteInfo.classList.remove('hidden');
}

// إعداد أزرار العمليات
function setupSiteActionButtons() {
    const moveBtn = document.getElementById('move-site-btn');
    const deleteBtn = document.getElementById('delete-site-btn');
    const hideBtn = document.getElementById('hide-site-btn');

    if (moveBtn) {
        moveBtn.addEventListener('click', () => {
            const selectedSite = document.getElementById('sites-select').value;
            if (selectedSite) {
                showSiteBulkActionModal(selectedSite, 'move');
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const selectedSite = document.getElementById('sites-select').value;
            if (selectedSite) {
                showSiteBulkActionModal(selectedSite, 'delete');
            }
        });
    }

    if (hideBtn) {
        hideBtn.addEventListener('click', () => {
            const selectedSite = document.getElementById('sites-select').value;
            if (selectedSite) {
                showSiteBulkActionModal(selectedSite, 'hide');
            }
        });
    }
}

// الحصول على جميع المواقع مع عدد الأفلام
function getAllSitesWithCounts() {
    const sitesMap = new Map();

    // معالجة الأفلام
    appState.movies.forEach(movie => {
        if (movie.href && !movie.hidden) {
            const site = getSiteFromUrl(movie.href);
            if (site) {
                if (!sitesMap.has(site)) {
                    sitesMap.set(site, { site, moviesCount: 0, seriesCount: 0 });
                }
                sitesMap.get(site).moviesCount++;
            }
        }
    });

    // معالجة المسلسلات
    appState.series.forEach(series => {
        if (series.href && !series.hidden) {
            const site = getSiteFromUrl(series.href);
            if (site) {
                if (!sitesMap.has(site)) {
                    sitesMap.set(site, { site, moviesCount: 0, seriesCount: 0 });
                }
                sitesMap.get(site).seriesCount++;
            }
        }
    });

    // تحويل إلى مصفوفة وإضافة المجموع
    const sitesArray = Array.from(sitesMap.values()).map(siteData => ({
        ...siteData,
        totalCount: siteData.moviesCount + siteData.seriesCount
    }));

    // ترتيب حسب العدد الإجمالي (تنازلي)
    return sitesArray.sort((a, b) => b.totalCount - a.totalCount);
}

// تحديد القسم أو المجلد الذي يحتوي على موقع معين
function getSiteLocation(siteName) {
    if (!siteName) return null;

    // البحث في قسم مواقع الأفلام أولاً
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (movieSitesCat) {
        // البحث في القائمة الرئيسية
        if (movieSitesCat.shortcuts && movieSitesCat.shortcuts.length > 0) {
            const siteInMain = movieSitesCat.shortcuts.find(site => {
                const siteUrl = site.url || site.href;
                return siteUrl && getSiteFromUrl(siteUrl) === siteName;
            });

            if (siteInMain) {
                return {
                    type: 'main',
                    location: 'القائمة الرئيسية',
                    categoryName: 'مواقع الأفلام'
                };
            }
        }

        // البحث في المجلدات
        if (movieSitesCat.folders && movieSitesCat.folders.length > 0) {
            for (const folder of movieSitesCat.folders) {
                if (folder.sites && folder.sites.length > 0) {
                    const siteInFolder = folder.sites.find(site => {
                        const siteUrl = site.url || site.href;
                        return siteUrl && getSiteFromUrl(siteUrl) === siteName;
                    });

                    if (siteInFolder) {
                        return {
                            type: 'folder',
                            location: folder.name,
                            categoryName: 'مواقع الأفلام',
                            folderId: folder.id
                        };
                    }
                }
            }
        }
    }

    // البحث في الأقسام الأخرى عن الأفلام والمسلسلات التي تحتوي على هذا الموقع
    const categoriesWithSite = [];

    // البحث في الأقسام الرئيسية
    for (const category of appState.categories.main) {
        if (category.id === 'movie-sites') continue; // تم البحث فيه بالفعل

        const hasMoviesFromSite = appState.movies.some(movie =>
            movie.category === category.id &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        );

        const hasSeriesFromSite = appState.series.some(series =>
            series.category === category.id &&
            !series.hidden &&
            series.href &&
            getSiteFromUrl(series.href) === siteName
        );

        if (hasMoviesFromSite || hasSeriesFromSite) {
            categoriesWithSite.push({
                type: 'main',
                categoryId: category.id,
                categoryName: category.name,
                moviesCount: appState.movies.filter(movie =>
                    movie.category === category.id &&
                    !movie.hidden &&
                    movie.href &&
                    getSiteFromUrl(movie.href) === siteName
                ).length,
                seriesCount: appState.series.filter(series =>
                    series.category === category.id &&
                    !series.hidden &&
                    series.href &&
                    getSiteFromUrl(series.href) === siteName
                ).length
            });
        }
    }

    // البحث في الأقسام الخاصة
    for (const category of appState.categories.special) {
        const hasMoviesFromSite = appState.movies.some(movie =>
            movie.category === category.id &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        );

        if (hasMoviesFromSite) {
            categoriesWithSite.push({
                type: 'special',
                categoryId: category.id,
                categoryName: category.name,
                moviesCount: appState.movies.filter(movie =>
                    movie.category === category.id &&
                    !movie.hidden &&
                    movie.href &&
                    getSiteFromUrl(movie.href) === siteName
                ).length,
                seriesCount: 0
            });
        }
    }

    // البحث في الأقسام الفرعية
    for (const category of [...appState.categories.sub, ...appState.categories.specialSub]) {
        const hasMoviesFromSite = appState.movies.some(movie =>
            movie.subCategories &&
            movie.subCategories.includes(category.id) &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        );

        const hasSeriesFromSite = appState.series.some(series =>
            series.subCategories &&
            series.subCategories.includes(category.id) &&
            !series.hidden &&
            series.href &&
            getSiteFromUrl(series.href) === siteName
        );

        if (hasMoviesFromSite || hasSeriesFromSite) {
            categoriesWithSite.push({
                type: 'sub',
                categoryId: category.id,
                categoryName: category.name,
                moviesCount: appState.movies.filter(movie =>
                    movie.subCategories &&
                    movie.subCategories.includes(category.id) &&
                    !movie.hidden &&
                    movie.href &&
                    getSiteFromUrl(movie.href) === siteName
                ).length,
                seriesCount: appState.series.filter(series =>
                    series.subCategories &&
                    series.subCategories.includes(category.id) &&
                    !series.hidden &&
                    series.href &&
                    getSiteFromUrl(series.href) === siteName
                ).length
            });
        }
    }

    // إرجاع النتائج
    if (categoriesWithSite.length > 0) {
        return {
            type: 'categories',
            categories: categoriesWithSite,
            totalCategories: categoriesWithSite.length
        };
    }

    return null;
}

// الحصول على بيان شامل بجميع الأقسام التي تحتوي على أفلام الموقع
function getComprehensiveSiteReport(siteName) {
    if (!siteName) return null;

    const report = {
        movieSitesSection: null,
        contentCategories: [],
        totalCategories: 0,
        totalMovies: 0,
        totalSeries: 0,
        grandTotal: 0
    };

    // البحث في قسم مواقع الأفلام
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (movieSitesCat) {
        // البحث في القائمة الرئيسية
        if (movieSitesCat.shortcuts && movieSitesCat.shortcuts.length > 0) {
            const siteInMain = movieSitesCat.shortcuts.find(site => {
                const siteUrl = site.url || site.href;
                return siteUrl && getSiteFromUrl(siteUrl) === siteName;
            });

            if (siteInMain) {
                report.movieSitesSection = {
                    type: 'main',
                    location: 'القائمة الرئيسية',
                    categoryName: 'مواقع الأفلام'
                };
                report.totalCategories++;
            }
        }

        // البحث في المجلدات
        if (!report.movieSitesSection && movieSitesCat.folders && movieSitesCat.folders.length > 0) {
            for (const folder of movieSitesCat.folders) {
                if (folder.sites && folder.sites.length > 0) {
                    const siteInFolder = folder.sites.find(site => {
                        const siteUrl = site.url || site.href;
                        return siteUrl && getSiteFromUrl(siteUrl) === siteName;
                    });

                    if (siteInFolder) {
                        report.movieSitesSection = {
                            type: 'folder',
                            location: folder.name,
                            categoryName: 'مواقع الأفلام',
                            folderId: folder.id
                        };
                        report.totalCategories++;
                        break;
                    }
                }
            }
        }
    }

    // البحث في الأقسام الرئيسية
    for (const category of appState.categories.main) {
        if (category.id === 'movie-sites') continue; // تم البحث فيه بالفعل

        const moviesCount = appState.movies.filter(movie =>
            movie.category === category.id &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        ).length;

        const seriesCount = appState.series.filter(series =>
            series.category === category.id &&
            !series.hidden &&
            series.href &&
            getSiteFromUrl(series.href) === siteName
        ).length;

        if (moviesCount > 0 || seriesCount > 0) {
            report.contentCategories.push({
                type: 'main',
                categoryId: category.id,
                categoryName: category.name,
                moviesCount: moviesCount,
                seriesCount: seriesCount
            });
            report.totalCategories++;
            report.totalMovies += moviesCount;
            report.totalSeries += seriesCount;
        }
    }

    // البحث في الأقسام الخاصة
    for (const category of appState.categories.special) {
        const moviesCount = appState.movies.filter(movie =>
            movie.category === category.id &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        ).length;

        if (moviesCount > 0) {
            report.contentCategories.push({
                type: 'special',
                categoryId: category.id,
                categoryName: category.name,
                moviesCount: moviesCount,
                seriesCount: 0
            });
            report.totalCategories++;
            report.totalMovies += moviesCount;
        }
    }

    // البحث في الأقسام الفرعية
    for (const category of [...appState.categories.sub, ...appState.categories.specialSub]) {
        const moviesCount = appState.movies.filter(movie =>
            movie.subCategories &&
            movie.subCategories.includes(category.id) &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        ).length;

        const seriesCount = appState.series.filter(series =>
            series.subCategories &&
            series.subCategories.includes(category.id) &&
            !series.hidden &&
            series.href &&
            getSiteFromUrl(series.href) === siteName
        ).length;

        if (moviesCount > 0 || seriesCount > 0) {
            report.contentCategories.push({
                type: 'sub',
                categoryId: category.id,
                categoryName: category.name,
                moviesCount: moviesCount,
                seriesCount: seriesCount
            });
            report.totalCategories++;
            report.totalMovies += moviesCount;
            report.totalSeries += seriesCount;
        }
    }

    // حساب المجموع الكلي
    report.grandTotal = report.totalMovies + report.totalSeries;

    // ترتيب الأقسام حسب العدد الإجمالي (تنازلي)
    report.contentCategories.sort((a, b) => {
        const totalA = a.moviesCount + a.seriesCount;
        const totalB = b.moviesCount + b.seriesCount;
        return totalB - totalA;
    });

    return report.totalCategories > 0 ? report : null;
}

// إظهار مودال العمليات الجماعية للموقع في قسم محدد
function showCategorySiteBulkActionModal(siteName, categoryId, action) {
    if (!siteName || !categoryId || !action) return;

    const modal = document.getElementById('site-bulk-action-modal');
    const titleElement = document.getElementById('site-action-title');
    const messageElement = document.getElementById('site-action-message');
    const optionsElement = document.getElementById('site-action-options');
    const confirmBtn = document.getElementById('site-action-confirm');

    if (!modal || !titleElement || !messageElement || !confirmBtn) return;

    // الحصول على معلومات القسم
    const categoryName = getCategoryName(categoryId);

    // حساب عدد العناصر في هذا القسم من هذا الموقع
    let moviesCount = 0;
    let seriesCount = 0;

    // تحديد نوع القسم للبحث الصحيح
    const isMainCategory = appState.categories.main.some(cat => cat.id === categoryId);
    const isSpecialCategory = appState.categories.special.some(cat => cat.id === categoryId);
    const isSubCategory = [...appState.categories.sub, ...appState.categories.specialSub].some(cat => cat.id === categoryId);

    if (isMainCategory || isSpecialCategory) {
        // البحث في الأقسام الرئيسية والخاصة
        moviesCount = appState.movies.filter(movie =>
            movie.category === categoryId &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        ).length;

        seriesCount = appState.series.filter(series =>
            series.category === categoryId &&
            !series.hidden &&
            series.href &&
            getSiteFromUrl(series.href) === siteName
        ).length;
    } else if (isSubCategory) {
        // البحث في الأقسام الفرعية
        moviesCount = appState.movies.filter(movie =>
            movie.subCategories &&
            movie.subCategories.includes(categoryId) &&
            !movie.hidden &&
            movie.href &&
            getSiteFromUrl(movie.href) === siteName
        ).length;

        seriesCount = appState.series.filter(series =>
            series.subCategories &&
            series.subCategories.includes(categoryId) &&
            !series.hidden &&
            series.href &&
            getSiteFromUrl(series.href) === siteName
        ).length;
    }

    const totalCount = moviesCount + seriesCount;

    if (totalCount === 0) {
        showToast('لا توجد عناصر من هذا الموقع في هذا القسم', 'info');
        return;
    }

    // تحديد النص والخيارات حسب نوع العملية
    let title, message, showOptions = false;

    switch (action) {
        case 'move':
            title = 'نقل أفلام الموقع من القسم';
            message = `هل تريد نقل جميع العناصر (${totalCount} عنصر) من موقع "${siteName}" الموجودة في قسم "${categoryName}" إلى قسم آخر؟`;
            showOptions = true;
            break;
        case 'delete':
            title = 'حذف أفلام الموقع من القسم';
            message = `هل تريد حذف جميع العناصر (${totalCount} عنصر) من موقع "${siteName}" الموجودة في قسم "${categoryName}" نهائياً؟\n\nتحذير: هذه العملية لا يمكن التراجع عنها!`;
            break;
        case 'hide':
            title = 'إخفاء أفلام الموقع من القسم';
            message = `هل تريد إخفاء جميع العناصر (${totalCount} عنصر) من موقع "${siteName}" الموجودة في قسم "${categoryName}"؟\n\nيمكنك إظهارها لاحقاً من إدارة الأفلام.`;
            break;
    }

    // تحديث محتوى المودال
    titleElement.textContent = title;
    messageElement.textContent = message;

    // إظهار/إخفاء خيارات النقل
    if (showOptions) {
        populateCategorySelect('site-target-category-select');
        optionsElement.classList.remove('hidden');
    } else {
        optionsElement.classList.add('hidden');
    }

    // إعداد زر التأكيد
    confirmBtn.onclick = () => {
        executeCategorySiteBulkAction(siteName, categoryId, action);
        modal.classList.remove('show');
    };

    // إظهار المودال
    modal.classList.add('show');

    // إضافة شريط التمرير الجانبي
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            createModalScrollbar(modalContent);
            console.log('✅ تم إضافة شريط التمرير لنافذة العمليات الجماعية للمواقع');
        }
    }, 100);
}

// تنفيذ العمليات الجماعية للموقع في قسم محدد
function executeCategorySiteBulkAction(siteName, categoryId, action) {
    if (!siteName || !categoryId || !action) return;

    const categoryName = getCategoryName(categoryId);
    let affectedCount = 0;

    // تحديد نوع القسم للبحث الصحيح
    const isMainCategory = appState.categories.main.some(cat => cat.id === categoryId);
    const isSpecialCategory = appState.categories.special.some(cat => cat.id === categoryId);
    const isSubCategory = [...appState.categories.sub, ...appState.categories.specialSub].some(cat => cat.id === categoryId);

    switch (action) {
        case 'move':
            const targetCategory = document.getElementById('site-target-category-select').value;
            if (!targetCategory) {
                showToast('يرجى اختيار قسم مستهدف', 'warning');
                return;
            }

            if (isMainCategory || isSpecialCategory) {
                // نقل من الأقسام الرئيسية والخاصة
                appState.movies.forEach(movie => {
                    if (movie.category === categoryId &&
                        !movie.hidden &&
                        movie.href &&
                        getSiteFromUrl(movie.href) === siteName) {
                        movie.category = targetCategory;
                        affectedCount++;
                    }
                });

                appState.series.forEach(series => {
                    if (series.category === categoryId &&
                        !series.hidden &&
                        series.href &&
                        getSiteFromUrl(series.href) === siteName) {
                        series.category = targetCategory;
                        affectedCount++;
                    }
                });
            } else if (isSubCategory) {
                // نقل من الأقسام الفرعية (إزالة من القسم الفرعي وإضافة للقسم الجديد)
                appState.movies.forEach(movie => {
                    if (movie.subCategories &&
                        movie.subCategories.includes(categoryId) &&
                        !movie.hidden &&
                        movie.href &&
                        getSiteFromUrl(movie.href) === siteName) {
                        // إزالة من القسم الفرعي الحالي
                        movie.subCategories = movie.subCategories.filter(subCat => subCat !== categoryId);
                        // إضافة للقسم الجديد
                        movie.category = targetCategory;
                        affectedCount++;
                    }
                });

                appState.series.forEach(series => {
                    if (series.subCategories &&
                        series.subCategories.includes(categoryId) &&
                        !series.hidden &&
                        series.href &&
                        getSiteFromUrl(series.href) === siteName) {
                        // إزالة من القسم الفرعي الحالي
                        series.subCategories = series.subCategories.filter(subCat => subCat !== categoryId);
                        // إضافة للقسم الجديد
                        series.category = targetCategory;
                        affectedCount++;
                    }
                });
            }

            showToast(`تم نقل ${affectedCount} عنصر من موقع "${siteName}" من قسم "${categoryName}" إلى قسم "${getCategoryName(targetCategory)}" بنجاح`, 'success');
            break;

        case 'delete':
            if (isMainCategory || isSpecialCategory) {
                // حذف من الأقسام الرئيسية والخاصة
                const originalMoviesLength = appState.movies.length;
                const originalSeriesLength = appState.series.length;

                appState.movies = appState.movies.filter(movie =>
                    !(movie.category === categoryId &&
                      !movie.hidden &&
                      movie.href &&
                      getSiteFromUrl(movie.href) === siteName)
                );

                appState.series = appState.series.filter(series =>
                    !(series.category === categoryId &&
                      !series.hidden &&
                      series.href &&
                      getSiteFromUrl(series.href) === siteName)
                );

                affectedCount = (originalMoviesLength - appState.movies.length) + (originalSeriesLength - appState.series.length);
            } else if (isSubCategory) {
                // حذف من الأقسام الفرعية (إزالة من القسم الفرعي فقط)
                appState.movies.forEach(movie => {
                    if (movie.subCategories &&
                        movie.subCategories.includes(categoryId) &&
                        !movie.hidden &&
                        movie.href &&
                        getSiteFromUrl(movie.href) === siteName) {
                        movie.subCategories = movie.subCategories.filter(subCat => subCat !== categoryId);
                        affectedCount++;
                    }
                });

                appState.series.forEach(series => {
                    if (series.subCategories &&
                        series.subCategories.includes(categoryId) &&
                        !series.hidden &&
                        series.href &&
                        getSiteFromUrl(series.href) === siteName) {
                        series.subCategories = series.subCategories.filter(subCat => subCat !== categoryId);
                        affectedCount++;
                    }
                });
            }

            showToast(`تم حذف ${affectedCount} عنصر من موقع "${siteName}" من قسم "${categoryName}" بنجاح`, 'success');
            break;

        case 'hide':
            if (isMainCategory || isSpecialCategory) {
                // إخفاء من الأقسام الرئيسية والخاصة
                appState.movies.forEach(movie => {
                    if (movie.category === categoryId &&
                        !movie.hidden &&
                        movie.href &&
                        getSiteFromUrl(movie.href) === siteName) {
                        movie.hidden = true;
                        affectedCount++;
                    }
                });

                appState.series.forEach(series => {
                    if (series.category === categoryId &&
                        !series.hidden &&
                        series.href &&
                        getSiteFromUrl(series.href) === siteName) {
                        series.hidden = true;
                        affectedCount++;
                    }
                });
            } else if (isSubCategory) {
                // إخفاء من الأقسام الفرعية
                appState.movies.forEach(movie => {
                    if (movie.subCategories &&
                        movie.subCategories.includes(categoryId) &&
                        !movie.hidden &&
                        movie.href &&
                        getSiteFromUrl(movie.href) === siteName) {
                        movie.hidden = true;
                        affectedCount++;
                    }
                });

                appState.series.forEach(series => {
                    if (series.subCategories &&
                        series.subCategories.includes(categoryId) &&
                        !series.hidden &&
                        series.href &&
                        getSiteFromUrl(series.href) === siteName) {
                        series.hidden = true;
                        affectedCount++;
                    }
                });
            }

            showToast(`تم إخفاء ${affectedCount} عنصر من موقع "${siteName}" من قسم "${categoryName}" بنجاح`, 'success');
            break;
    }

    // حفظ البيانات وتحديث الواجهة
    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث قائمة المواقع وإعادة عرض معلومات الموقع
    populateSitesSelect();

    // إعادة تحديد الموقع لتحديث المعلومات
    const sitesSelect = document.getElementById('sites-select');
    if (sitesSelect) {
        sitesSelect.value = siteName;
        handleSiteSelection();
    }

    // تحديث العرض الحالي إذا لزم الأمر
    if (appState.currentCategory !== 'all') {
        displayMovies(appState.currentCategory, appState.currentPage);
    }
}



// إعداد مودال العمليات الجماعية للمواقع
function setupSiteBulkActionModal() {
    const modal = document.getElementById('site-bulk-action-modal');
    if (!modal) return;

    // إعداد أزرار الإغلاق
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('site-action-cancel');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    // إغلاق عند النقر خارج المودال
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

// إظهار مودال العمليات الجماعية للمواقع
function showSiteBulkActionModal(site, action) {
    const modal = document.getElementById('site-bulk-action-modal');
    const titleElement = document.getElementById('site-action-title');
    const messageElement = document.getElementById('site-action-message');
    const optionsElement = document.getElementById('site-action-options');
    const confirmBtn = document.getElementById('site-action-confirm');

    if (!modal || !titleElement || !messageElement || !confirmBtn) return;

    // الحصول على عدد العناصر للموقع
    const siteData = getAllSitesWithCounts().find(s => s.site === site);
    const totalCount = siteData ? siteData.totalCount : 0;

    // تحديد النص والخيارات حسب نوع العملية
    let title, message, showOptions = false;

    switch (action) {
        case 'move':
            title = 'نقل أفلام الموقع';
            message = `هل تريد نقل جميع الأفلام والمسلسلات (${totalCount} عنصر) من موقع "${site}" إلى قسم آخر؟`;
            showOptions = true;
            break;
        case 'delete':
            title = 'حذف أفلام الموقع';
            message = `هل تريد حذف جميع الأفلام والمسلسلات (${totalCount} عنصر) من موقع "${site}" نهائياً؟\n\nتحذير: هذه العملية لا يمكن التراجع عنها!`;
            break;
        case 'hide':
            title = 'إخفاء أفلام الموقع';
            message = `هل تريد إخفاء جميع الأفلام والمسلسلات (${totalCount} عنصر) من موقع "${site}"؟\n\nيمكنك إظهارها لاحقاً من إدارة الأفلام.`;
            break;
    }

    // تحديث محتوى المودال
    titleElement.textContent = title;
    messageElement.textContent = message;

    // إظهار/إخفاء خيارات القسم المستهدف
    if (showOptions) {
        optionsElement.classList.remove('hidden');
        updateTargetCategorySelect();
    } else {
        optionsElement.classList.add('hidden');
    }

    // إعداد زر التأكيد
    confirmBtn.onclick = () => {
        executeSiteBulkAction(site, action);
        modal.classList.remove('show');
    };

    // إظهار المودال
    modal.classList.add('show');
}

// تحديث قائمة الأقسام المستهدفة
function updateTargetCategorySelect() {
    const select = document.getElementById('site-target-category-select');
    if (!select) {
        console.log('لم يتم العثور على عنصر site-target-category-select');
        return;
    }

    // تفريغ الخيارات
    select.innerHTML = '';

    // إضافة خيار افتراضي
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- اختر قسماً --';
    select.appendChild(defaultOption);

    // إضافة الأقسام الرئيسية
    appState.categories.main.forEach(category => {
        if (category.id !== 'movie-sites' && category.id !== 'all') { // استبعاد قسم مواقع الأفلام وجميع الأفلام
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        }
    });

    // إضافة الأقسام الخاصة إذا كانت مرئية
    if (appState.showSpecialSections) {
        appState.categories.special.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    console.log(`تم تحديث قائمة الأقسام المستهدفة بـ ${select.options.length} خيار`);
}

// تنفيذ العمليات الجماعية للمواقع
function executeSiteBulkAction(site, action) {
    let affectedCount = 0;

    switch (action) {
        case 'move':
            const targetCategory = document.getElementById('site-target-category-select').value;
            if (!targetCategory) {
                showToast('يرجى اختيار قسم مستهدف', 'warning');
                return;
            }

            // نقل الأفلام
            appState.movies.forEach(movie => {
                if (getSiteFromUrl(movie.href) === site) {
                    movie.category = targetCategory;
                    affectedCount++;
                }
            });

            // نقل المسلسلات
            appState.series.forEach(series => {
                if (getSiteFromUrl(series.href) === site) {
                    series.category = targetCategory;
                    affectedCount++;
                }
            });

            showToast(`تم نقل ${affectedCount} عنصر من موقع "${site}" إلى قسم "${getCategoryName(targetCategory)}" بنجاح`, 'success');
            break;

        case 'delete':
            const originalMoviesCount = appState.movies.length;
            const originalSeriesCount = appState.series.length;

            // حذف الأفلام
            appState.movies = appState.movies.filter(movie => getSiteFromUrl(movie.href) !== site);

            // حذف المسلسلات
            appState.series = appState.series.filter(series => getSiteFromUrl(series.href) !== site);

            affectedCount = (originalMoviesCount - appState.movies.length) + (originalSeriesCount - appState.series.length);
            showToast(`تم حذف ${affectedCount} عنصر من موقع "${site}" بنجاح`, 'success');
            break;

        case 'hide':
            // إخفاء الأفلام
            appState.movies.forEach(movie => {
                if (getSiteFromUrl(movie.href) === site) {
                    movie.hidden = true;
                    affectedCount++;
                }
            });

            // إخفاء المسلسلات
            appState.series.forEach(series => {
                if (getSiteFromUrl(series.href) === site) {
                    series.hidden = true;
                    affectedCount++;
                }
            });

            showToast(`تم إخفاء ${affectedCount} عنصر من موقع "${site}" بنجاح`, 'success');
            break;
    }

    // حفظ البيانات وتحديث الواجهة
    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث قائمة المواقع
    populateSitesSelect();

    // تحديث العرض الحالي إذا لزم الأمر
    if (appState.currentCategory !== 'all') {
        displayMovies(appState.currentCategory, appState.currentPage);
    }
}

// إدارة المجلدات من قسم إدارة الأفلام
function toggleFolderVisibility(folderId, isVisible) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder) return;

    folder.hidden = !isVisible;
    saveAppData();

    // تحديث العرض
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم ${isVisible ? 'إظهار' : 'إخفاء'} مجلد "${folder.name}" بنجاح`, 'success');
}

function renameFolderFromManagement(folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder) return;

    const newName = prompt('أدخل الاسم الجديد للمجلد:', folder.name);
    if (newName && newName.trim()) {
        renameSiteFolder(folderId, newName);
        displayManagedMovies(); // تحديث العرض
    }
}

function deleteFolderFromManagement(folderId) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder) return;

    if (confirm(`هل أنت متأكد من حذف مجلد "${folder.name}"؟\nسيتم نقل محتوياته إلى القائمة الرئيسية.`)) {
        deleteSiteFolder(folderId);
        displayManagedMovies(); // تحديث العرض
    }
}

function editSiteFromManagement(siteIndex) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat || !movieSitesCat.shortcuts || siteIndex >= movieSitesCat.shortcuts.length) return;

    const site = movieSitesCat.shortcuts[siteIndex];
    const newName = prompt('أدخل الاسم الجديد للموقع:', site.name || site.title || site.url);
    const newUrl = prompt('أدخل الرابط الجديد للموقع:', site.url || site.href);

    if (newName && newUrl) {
        site.name = newName.trim();
        site.url = newUrl.trim();
        site.href = newUrl.trim(); // للتوافق مع الإصدارات القديمة

        saveAppData();
        updateCategoriesCounts();
        renderCategories();
        displayManagedMovies();

        // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
        if (appState.currentCategory === 'movie-sites') {
            displayMovies('movie-sites', appState.currentPage);
        }

        showToast('تم تحديث الموقع بنجاح', 'success');
    }
}

function deleteSiteFromManagement(siteIndex) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat || !movieSitesCat.shortcuts || siteIndex >= movieSitesCat.shortcuts.length) return;

    const site = movieSitesCat.shortcuts[siteIndex];
    movieSitesCat.shortcuts.splice(siteIndex, 1);

    saveAppData();
    updateCategoriesCounts();
    renderCategories();
    displayManagedMovies();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast(`تم حذف الموقع "${site.name || site.url}" بنجاح`, 'success');
}

// دوال ترتيب المواقع داخل المجلدات
function moveSiteInFolder(folderId, fromIndex, toIndex) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder || !folder.sites) return;

    // التحقق من صحة المؤشرات
    if (fromIndex < 0 || fromIndex >= folder.sites.length ||
        toIndex < 0 || toIndex >= folder.sites.length ||
        fromIndex === toIndex) return;

    // نقل الموقع
    const site = folder.sites.splice(fromIndex, 1)[0];
    folder.sites.splice(toIndex, 0, site);

    saveAppData();
    updateCategoriesCounts();
    renderCategories();

    // تحديث العرض إذا كان المستخدم في قسم مواقع الأفلام
    if (appState.currentCategory === 'movie-sites') {
        displayMovies('movie-sites', appState.currentPage);
    }

    showToast('تم تغيير ترتيب الموقع بنجاح', 'success');
}

function changeSitePosition(folderId, currentIndex) {
    const movieSitesCat = appState.categories.main.find(cat => cat.id === 'movie-sites');
    if (!movieSitesCat) return;

    const folder = movieSitesCat.folders.find(f => f.id === folderId);
    if (!folder || !folder.sites || folder.sites.length <= 1) return;

    const site = folder.sites[currentIndex];
    const newPosition = prompt(
        `أدخل الموضع الجديد للموقع "${site.name || site.url}"\n` +
        `الموضع الحالي: ${currentIndex + 1}\n` +
        `المواضع المتاحة: 1 إلى ${folder.sites.length}`,
        (currentIndex + 1).toString()
    );

    if (!newPosition) return;

    const newIndex = parseInt(newPosition) - 1;

    if (isNaN(newIndex) || newIndex < 0 || newIndex >= folder.sites.length) {
        showToast('رقم الموضع غير صحيح', 'warning');
        return;
    }

    if (newIndex === currentIndex) {
        showToast('الموقع في نفس الموضع بالفعل', 'info');
        return;
    }

    // نقل الموقع إلى الموضع الجديد
    moveSiteInFolder(folderId, currentIndex, newIndex);
}

// إعداد نظام الاختيار بالأرقام للقوائم المنسدلة
function setupNumberInputs() {
    console.log('Setting up number inputs...');

    // تأخير قصير للتأكد من تحميل جميع العناصر
    setTimeout(() => {
        // خريطة الخيارات للقوائم المختلفة
        const selectMappings = {
            'sort-options': {
                1: 'name',
                2: 'site',
                3: 'date',
                4: 'date-asc',
                5: 'star'
            },
            'view-mode': {
                1: 'grid',
                2: 'list'
            }
        };

        // إعداد حقول الإدخال الرقمية مع أزرار التنفيذ
        setupNumberInputWithButton('sort-options-input', 'sort-options-apply', 'sort-options', selectMappings['sort-options'], (value) => {
            console.log('Sort callback called with:', value);
            appState.sortBy = value;
            updateFilterVisibility();
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
            saveAppData();
            showToast(`تم تغيير الترتيب إلى: ${getOptionText('sort-options', value)}`, 'success');
        });

        setupNumberInputWithButton('view-mode-input', 'view-mode-apply', 'view-mode', selectMappings['view-mode'], (value) => {
            console.log('View mode callback called with:', value);
            appState.viewMode = value;
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
            saveAppData();
            showToast(`تم تغيير العرض إلى: ${getOptionText('view-mode', value)}`, 'success');
        });

        // إعداد حقول الفلاتر الديناميكية مع أزرار التنفيذ
        setupDynamicNumberInputWithButton('site-filter-input', 'site-filter-apply', 'site-filter', (value) => {
            console.log('Site filter callback called with:', value);
            appState.selectedSite = value;
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
            saveAppData();
            const siteName = value || 'جميع المواقع';
            showToast(`تم تطبيق فلتر الموقع: ${siteName}`, 'success');
        });

        setupDynamicNumberInputWithButton('star-filter-input', 'star-filter-apply', 'star-filter', (value) => {
            console.log('Star filter callback called with:', value);
            appState.selectedStar = value;
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
            saveAppData();
            const starName = value || 'جميع النجوم';
            showToast(`تم تطبيق فلتر النجم: ${starName}`, 'success');
        });

        // تحديث الأرقام في خيارات الفلاتر عند تغييرها
        const originalPopulateSiteFilterMain = populateSiteFilterMain;
        populateSiteFilterMain = function() {
            originalPopulateSiteFilterMain.call(this);
            updateDynamicSelectNumbers('site-filter');
            updateNumberInputFromSelect('site-filter-input', 'site-filter');
        };

        const originalPopulateStarFilter = populateStarFilter;
        populateStarFilter = function() {
            originalPopulateStarFilter.call(this);
            updateDynamicSelectNumbers('star-filter');
            updateNumberInputFromSelect('star-filter-input', 'star-filter');
        };

        // تحديث حقول الإدخال الرقمية بالقيم الحالية
        updateNumberInputsFromSelects();

        console.log('Number inputs setup completed');

        // إضافة مستمعي أحداث مباشرة كبديل
        setupDirectEventListeners();
    }, 500);
}

// إعداد مستمعي أحداث مباشرة للأزرار
function setupDirectEventListeners() {
    console.log('Setting up direct event listeners...');

    // زر ترتيب الأفلام
    const sortApplyBtn = document.getElementById('sort-options-apply');
    if (sortApplyBtn) {
        sortApplyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Sort apply button clicked directly');

            const input = document.getElementById('sort-options-input');
            const select = document.getElementById('sort-options');

            if (input && select) {
                const number = parseInt(input.value);
                const mapping = { 1: 'name', 2: 'site', 3: 'date', 4: 'date-asc', 5: 'star' };

                if (number && mapping[number]) {
                    console.log(`Setting sort to: ${mapping[number]}`);
                    select.value = mapping[number];
                    appState.sortBy = mapping[number];
                    updateFilterVisibility();
                    displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
                    saveAppData();
                    showToast(`تم تغيير الترتيب إلى: ${getOptionText('sort-options', mapping[number])}`, 'success');
                }
            }
        });
    }

    // زر نوع العرض
    const viewApplyBtn = document.getElementById('view-mode-apply');
    if (viewApplyBtn) {
        viewApplyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('View mode apply button clicked directly');

            const input = document.getElementById('view-mode-input');
            const select = document.getElementById('view-mode');

            if (input && select) {
                const number = parseInt(input.value);
                const mapping = { 1: 'grid', 2: 'list' };

                if (number && mapping[number]) {
                    console.log(`Setting view mode to: ${mapping[number]}`);
                    select.value = mapping[number];
                    appState.viewMode = mapping[number];
                    displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
                    saveAppData();
                    showToast(`تم تغيير العرض إلى: ${getOptionText('view-mode', mapping[number])}`, 'success');
                }
            }
        });
    }

    // زر فلتر المواقع
    const siteApplyBtn = document.getElementById('site-filter-apply');
    if (siteApplyBtn) {
        siteApplyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Site filter apply button clicked directly');

            const input = document.getElementById('site-filter-input');
            const select = document.getElementById('site-filter');

            if (input && select) {
                const number = parseInt(input.value);

                if (number === 0) {
                    select.value = '';
                    appState.selectedSite = '';
                    displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
                    saveAppData();
                    showToast('تم تطبيق فلتر الموقع: جميع المواقع', 'success');
                } else if (number > 0 && number <= select.options.length - 1) {
                    const option = select.options[number];
                    if (option) {
                        select.value = option.value;
                        appState.selectedSite = option.value;
                        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
                        saveAppData();
                        showToast(`تم تطبيق فلتر الموقع: ${option.value}`, 'success');
                    }
                }
            }
        });
    }

    // زر فلتر النجوم
    const starApplyBtn = document.getElementById('star-filter-apply');
    if (starApplyBtn) {
        starApplyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Star filter apply button clicked directly');

            const input = document.getElementById('star-filter-input');
            const select = document.getElementById('star-filter');

            if (input && select) {
                const number = parseInt(input.value);

                if (number === 0) {
                    select.value = '';
                    appState.selectedStar = '';
                    displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
                    saveAppData();
                    showToast('تم تطبيق فلتر النجم: جميع النجوم', 'success');
                } else if (number > 0 && number <= select.options.length - 1) {
                    const option = select.options[number];
                    if (option) {
                        select.value = option.value;
                        appState.selectedStar = option.value;
                        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
                        saveAppData();
                        showToast(`تم تطبيق فلتر النجم: ${option.value}`, 'success');
                    }
                }
            }
        });
    }

    console.log('Direct event listeners setup completed');
}

// وظائف التطبيق المباشرة للأزرار (تستدعى من HTML)
function applySortOption() {
    console.log('applySortOption called');

    const input = document.getElementById('sort-options-input');
    const select = document.getElementById('sort-options');

    if (!input || !select) {
        console.error('Sort elements not found');
        return;
    }

    const number = parseInt(input.value);
    const mapping = { 1: 'name', 2: 'site', 3: 'date', 4: 'date-asc', 5: 'star' };

    console.log(`Sort number: ${number}, mapping:`, mapping);

    if (number && mapping[number]) {
        console.log(`Setting sort to: ${mapping[number]}`);
        select.value = mapping[number];
        appState.sortBy = mapping[number];
        updateFilterVisibility();
        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
        saveAppData();
        showToast(`تم تغيير الترتيب إلى: ${getOptionText('sort-options', mapping[number])}`, 'success');
    } else {
        showToast('رقم الترتيب غير صحيح. استخدم رقم من 1 إلى 5', 'warning');
    }
}

function applyViewMode() {
    console.log('applyViewMode called');

    const input = document.getElementById('view-mode-input');
    const select = document.getElementById('view-mode');

    if (!input || !select) {
        console.error('View mode elements not found');
        return;
    }

    const number = parseInt(input.value);
    const mapping = { 1: 'grid', 2: 'list' };

    console.log(`View mode number: ${number}, mapping:`, mapping);

    if (number && mapping[number]) {
        console.log(`Setting view mode to: ${mapping[number]}`);
        select.value = mapping[number];
        appState.viewMode = mapping[number];
        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
        saveAppData();
        showToast(`تم تغيير العرض إلى: ${getOptionText('view-mode', mapping[number])}`, 'success');
    } else {
        showToast('رقم العرض غير صحيح. استخدم 1 للشبكي أو 2 للقائمة', 'warning');
    }
}

function applySiteFilter() {
    console.log('applySiteFilter called');

    const input = document.getElementById('site-filter-input');
    const select = document.getElementById('site-filter');

    if (!input || !select) {
        console.error('Site filter elements not found');
        return;
    }

    const number = parseInt(input.value);

    console.log(`Site filter number: ${number}, options length: ${select.options.length}`);

    if (number === 0) {
        select.value = '';
        appState.selectedSite = '';
        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
        saveAppData();
        showToast('تم تطبيق فلتر الموقع: جميع المواقع', 'success');
    } else if (number > 0 && number <= select.options.length - 1) {
        const option = select.options[number];
        if (option) {
            select.value = option.value;
            appState.selectedSite = option.value;
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
            saveAppData();
            showToast(`تم تطبيق فلتر الموقع: ${option.value}`, 'success');
        }
    } else {
        showToast(`رقم الموقع غير صحيح. استخدم 0 للكل أو رقم من 1 إلى ${select.options.length - 1}`, 'warning');
    }
}

function applyStarFilter() {
    console.log('applyStarFilter called');

    const input = document.getElementById('star-filter-input');
    const select = document.getElementById('star-filter');

    if (!input || !select) {
        console.error('Star filter elements not found');
        return;
    }

    const number = parseInt(input.value);

    console.log(`Star filter number: ${number}, options length: ${select.options.length}`);

    if (number === 0) {
        select.value = '';
        appState.selectedStar = '';
        displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
        saveAppData();
        showToast('تم تطبيق فلتر النجم: جميع النجوم', 'success');
    } else if (number > 0 && number <= select.options.length - 1) {
        const option = select.options[number];
        if (option) {
            select.value = option.value;
            appState.selectedStar = option.value;
            displayMoviesWithoutScroll(appState.currentCategory, appState.currentPage);
            saveAppData();
            showToast(`تم تطبيق فلتر النجم: ${option.value}`, 'success');
        }
    } else {
        showToast(`رقم النجم غير صحيح. استخدم 0 للكل أو رقم من 1 إلى ${select.options.length - 1}`, 'warning');
    }
}

// إعداد حقل إدخال رقمي مع زر تنفيذ لقائمة منسدلة ثابتة
function setupNumberInputWithButton(inputId, buttonId, selectId, mapping, callback) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const select = document.getElementById(selectId);

    console.log(`Setting up number input: ${inputId}, button: ${buttonId}, select: ${selectId}`);
    console.log('Elements found:', { input: !!input, button: !!button, select: !!select });

    if (!input || !button || !select) {
        console.error(`Missing elements for ${inputId}:`, { input: !!input, button: !!button, select: !!select });
        return;
    }

    // وظيفة تطبيق الاختيار
    const applySelection = () => {
        const number = parseInt(input.value);
        console.log(`Applying selection: number=${number}, mapping=`, mapping);

        if (number && mapping[number]) {
            console.log(`Setting select value to: ${mapping[number]}`);
            select.value = mapping[number];
            if (callback) {
                console.log('Calling callback with:', mapping[number]);
                callback(mapping[number]);
            }
        } else {
            console.log('Invalid number or mapping not found');
        }
    };

    // مستمع زر التنفيذ
    button.addEventListener('click', (e) => {
        console.log(`Button clicked: ${buttonId}`);
        e.preventDefault();
        applySelection();
    });

    // مستمع Enter في حقل الإدخال
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applySelection();
        }
    });

    // مستمع تغيير فوري (تحديث القائمة المنسدلة فقط)
    input.addEventListener('input', (e) => {
        const number = parseInt(e.target.value);
        if (number && mapping[number]) {
            // تحديث القائمة المنسدلة فقط بدون تنفيذ الكولباك
            select.value = mapping[number];
        }
    });

    // مستمع تغيير القائمة المنسدلة لتحديث حقل الإدخال (بدون تنفيذ الكولباك لتجنب التضارب)
    select.addEventListener('change', (e) => {
        const value = e.target.value;
        const number = Object.keys(mapping).find(key => mapping[key] === value);
        if (number) {
            input.value = number;
        }
        // لا نستدعي الكولباك هنا لتجنب التضارب مع مستمعي الأحداث الأخرى
    });

    // تحديث حقل الإدخال بالقيمة الحالية
    const currentValue = select.value;
    const currentNumber = Object.keys(mapping).find(key => mapping[key] === currentValue);
    if (currentNumber) {
        input.value = currentNumber;
    }
}

// إعداد حقل إدخال رقمي مع زر تنفيذ لقائمة منسدلة ديناميكية
function setupDynamicNumberInputWithButton(inputId, buttonId, selectId, callback) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const select = document.getElementById(selectId);

    console.log(`Setting up dynamic number input: ${inputId}, button: ${buttonId}, select: ${selectId}`);
    console.log('Elements found:', { input: !!input, button: !!button, select: !!select });

    if (!input || !button || !select) {
        console.error(`Missing elements for ${inputId}:`, { input: !!input, button: !!button, select: !!select });
        return;
    }

    // وظيفة تطبيق الاختيار
    const applySelection = () => {
        const number = parseInt(input.value);
        console.log(`Applying dynamic selection: number=${number}, options length=${select.options.length}`);

        if (number === 0) {
            console.log('Setting select to empty (all)');
            select.value = '';
            if (callback) {
                console.log('Calling callback with empty value');
                callback('');
            }
        } else if (number > 0 && number <= select.options.length - 1) {
            const option = select.options[number];
            if (option) {
                console.log(`Setting select value to: ${option.value}`);
                select.value = option.value;
                if (callback) {
                    console.log('Calling callback with:', option.value);
                    callback(option.value);
                }
            }
        } else {
            console.log('Invalid number or out of range');
        }
    };

    // مستمع زر التنفيذ
    button.addEventListener('click', (e) => {
        console.log(`Dynamic button clicked: ${buttonId}`);
        e.preventDefault();
        applySelection();
    });

    // مستمع Enter في حقل الإدخال
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applySelection();
        }
    });

    // مستمع تغيير فوري (تحديث القائمة المنسدلة فقط)
    input.addEventListener('input', (e) => {
        const number = parseInt(e.target.value);
        if (number === 0) {
            // تحديث القائمة المنسدلة فقط بدون تنفيذ الكولباك
            select.value = '';
        } else if (number > 0 && number <= select.options.length - 1) {
            const option = select.options[number];
            if (option) {
                select.value = option.value;
            }
        }
    });

    // مستمع تغيير القائمة المنسدلة لتحديث حقل الإدخال (بدون تنفيذ الكولباك لتجنب التضارب)
    select.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === '') {
            input.value = '0';
        } else {
            const optionIndex = Array.from(select.options).findIndex(opt => opt.value === value);
            if (optionIndex > 0) {
                input.value = optionIndex.toString();
            }
        }
        // لا نستدعي الكولباك هنا لتجنب التضارب مع مستمعي الأحداث الأخرى
    });
}

// الحصول على نص الخيار من القائمة المنسدلة
function getOptionText(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select) return value;

    const option = Array.from(select.options).find(opt => opt.value === value);
    return option ? option.textContent.replace(/^\d+\.\s*/, '') : value;
}

// تحديث حقل الإدخال الرقمي من القائمة المنسدلة
function updateNumberInputFromSelect(inputId, selectId) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);

    if (!input || !select) return;

    const value = select.value;
    if (value === '') {
        input.value = '0';
    } else {
        const optionIndex = Array.from(select.options).findIndex(opt => opt.value === value);
        if (optionIndex > 0) {
            input.value = optionIndex.toString();
        }
    }
}

// تحديث جميع حقول الإدخال الرقمية من القوائم المنسدلة
function updateNumberInputsFromSelects() {
    // تحديث حقول الترتيب الثابتة
    const sortMappings = {
        'name': '1',
        'site': '2',
        'date': '3',
        'date-asc': '4',
        'star': '5'
    };

    const viewMappings = {
        'grid': '1',
        'list': '2'
    };

    // تحديث حقل الترتيب
    const sortSelect = document.getElementById('sort-options');
    const sortInput = document.getElementById('sort-options-input');
    if (sortSelect && sortInput) {
        const sortValue = sortSelect.value;
        if (sortMappings[sortValue]) {
            sortInput.value = sortMappings[sortValue];
        }
    }

    // تحديث حقل العرض
    const viewSelect = document.getElementById('view-mode');
    const viewInput = document.getElementById('view-mode-input');
    if (viewSelect && viewInput) {
        const viewValue = viewSelect.value;
        if (viewMappings[viewValue]) {
            viewInput.value = viewMappings[viewValue];
        }
    }

    // تحديث حقول الفلاتر الديناميكية
    updateNumberInputFromSelect('site-filter-input', 'site-filter');
    updateNumberInputFromSelect('star-filter-input', 'star-filter');
}

// إعداد حقل إدخال رقمي لقائمة منسدلة ديناميكية
function setupDynamicNumberInput(inputId, selectId, callback) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);

    if (!input || !select) return;

    // مستمع تغيير حقل الإدخال
    input.addEventListener('input', (e) => {
        const number = parseInt(e.target.value);
        if (number === 0) {
            select.value = '';
            if (callback) callback('');
        } else if (number > 0 && number <= select.options.length - 1) {
            const option = select.options[number];
            if (option) {
                select.value = option.value;
                if (callback) callback(option.value);
            }
        }
    });

    // مستمع تغيير القائمة المنسدلة لتحديث حقل الإدخال
    select.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === '') {
            input.value = '0';
        } else {
            const optionIndex = Array.from(select.options).findIndex(opt => opt.value === value);
            if (optionIndex > 0) {
                input.value = optionIndex.toString();
            }
        }
        if (callback) callback(value);
    });
}

// تحديث أرقام خيارات القائمة المنسدلة الديناميكية
function updateDynamicSelectNumbers(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // إضافة أرقام للخيارات
    Array.from(select.options).forEach((option, index) => {
        if (index === 0) {
            // الخيار الأول (الكل)
            if (!option.textContent.startsWith('0.')) {
                option.textContent = '0. ' + option.textContent;
            }
        } else {
            // باقي الخيارات
            if (!option.textContent.startsWith(index + '.')) {
                option.textContent = index + '. ' + option.textContent;
            }
        }
    });
}

// إعداد اختصارات لوحة المفاتيح
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // تجاهل إذا كان المستخدم في حقل إدخال
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(e.key) {
            case 'Escape':
                // إغلاق النوافذ المنبثقة
                const modal = document.querySelector('.modal.active');
                if (modal) {
                    closeModal(modal.id.replace('-modal', ''));
                }
                break;

            case 'r':
                if (e.ctrlKey) {
                    e.preventDefault();
                    // إعادة تحميل البيانات
                    loadFromJSONBin();
                }
                break;

            case 's':
                if (e.ctrlKey) {
                    e.preventDefault();
                    // حفظ البيانات
                    saveAppData();
                }
                break;

            case '/':
                if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
                    e.preventDefault();
                    // التركيز على حقل البحث
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }
                break;
        }
    });

    console.log('تم إعداد اختصارات لوحة المفاتيح بنجاح');
}

// تهيئة التطبيق
function initializeApp() {
    loadAppData().then(() => {
        renderCategories();
        displayMovies('all', 1);
        setupEventListeners();
        setupKeyboardShortcuts();
        setupZoomControls();
        setupPasswordProtection();
        setupMovieOpenMode();
        setupSitesManagement();
        setupCategorySortingTool();
        setupSubcategoryManagement();
        setupBulkOperations();
        setupMovieManagement();
        setupDataManagement();
        setupAdvancedSearch();
        setupMovieFilters();
        setupCategoryManagement();
        setupSitesBulkActions();
        setupNumberInputs(); // إضافة نظام الاختيار بالأرقام
        updateCategoriesCounts();

        // تحديث عنوان الصفحة الأولي
        const initialTitle = 'جميع الأفلام والمسلسلات - New Koktil-aflam v25';
        document.title = initialTitle;
        appState.currentPageTitle = initialTitle;

        // إضافة شريط التمرير لجميع المودالات الموجودة
        setTimeout(() => {
            addScrollbarToAllModals();
            observeNewModals();

            // إجبار إظهار جميع أشرطة التمرير
            setTimeout(() => {
                forceShowAllScrollbars();
                console.log('💪 تم إجبار إظهار جميع الأشرطة عند التحميل');
            }, 200);

            // إجبار إضافي أقوى
            setTimeout(() => {
                forceShowAllScrollbars();
                console.log('💪💪 إجبار إضافي أقوى عند التحميل');
            }, 1000);
        }, 500);

        console.log('تم تحميل التطبيق بنجاح');
    }).catch(error => {
        console.error('خطأ في تحميل التطبيق:', error);
        showToast('خطأ في تحميل البيانات', 'error');
    });
}

// إضافة فيلم من الإضافة
function addMovieFromExtension(movieData, isSeries = false) {
    try {
        console.log('إضافة فيلم من الإضافة:', movieData, 'isSeries:', isSeries);

        // التحقق من البيانات المطلوبة
        if (!movieData.name || !movieData.href) {
            console.error('بيانات الفيلم غير مكتملة:', movieData);
            showToast('بيانات الفيلم غير مكتملة', 'warning');
            return false;
        }

        // إنشاء كائن الفيلم مثل نظام الإضافة اليدوية
        const newMovie = {
            id: movieData.id || generateUniqueId(),
            name: movieData.name,
            href: movieData.href,
            img: movieData.img || getDefaultMovieImage(),
            category: movieData.category || 'main',
            subCategories: movieData.subCategories || [],
            dateAdded: movieData.dateAdded || new Date().toISOString(),
            addedFrom: 'extension' // تمييز المصدر
        };

        console.log('كائن الفيلم الجديد:', newMovie);

        // إضافة إلى القائمة المناسبة
        if (isSeries) {
            appState.series.push(newMovie);
            console.log('تم إضافة المسلسل إلى appState.series');
        } else {
            appState.movies.push(newMovie);
            console.log('تم إضافة الفيلم إلى appState.movies');
        }

        // حفظ البيانات وتحديث الواجهة (مثل نظام الإضافة اليدوية)
        saveAppData();
        console.log('تم حفظ البيانات');

        updateCategoriesCounts();
        console.log('تم تحديث عدادات الأقسام');

        renderCategories();
        console.log('تم تحديث عرض الأقسام');

        // تحديث العرض الحالي إذا كان في نفس القسم أو في "الكل"
        if (appState.currentCategory === newMovie.category ||
            appState.currentCategory === 'all' ||
            appState.currentCategory === 'main') {
            displayMovies(appState.currentCategory, appState.currentPage);
            console.log('تم تحديث عرض الأفلام');
        }

        showToast(`تم إضافة ${isSeries ? 'المسلسل' : 'الفيلم'} "${newMovie.name}" من الإضافة بنجاح`, 'success');
        console.log('تم إضافة الفيلم بنجاح');
        return true;
    } catch (error) {
        console.error('خطأ في إضافة الفيلم من الإضافة:', error);
        showToast('فشل في إضافة الفيلم من الإضافة', 'error');
        return false;
    }
}

// تحميل الأفلام المعلقة من الإضافة
function loadPendingMoviesFromExtension(pendingMovies) {
    try {
        let addedCount = 0;
        let failedCount = 0;

        pendingMovies.forEach(movieData => {
            const success = addMovieFromExtension(movieData, movieData.isSeries);
            if (success) {
                addedCount++;
            } else {
                failedCount++;
            }
        });

        if (addedCount > 0) {
            showToast(`تم تحميل ${addedCount} فيلم من الإضافة بنجاح`, 'success');
        }

        if (failedCount > 0) {
            showToast(`فشل في تحميل ${failedCount} فيلم`, 'warning');
        }

        return { added: addedCount, failed: failedCount };
    } catch (error) {
        console.error('خطأ في تحميل الأفلام المعلقة:', error);
        showToast('فشل في تحميل الأفلام من الإضافة', 'error');
        return { added: 0, failed: pendingMovies.length };
    }
}

// الحصول على صورة افتراضية للفيلم
function getDefaultMovieImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzIi8+CjxwYXRoIGQ9Ik04MCA5MEwxMjAgMTIwTDgwIDE1MFoiIGZpbGw9IiM2NjYiLz4KPHRleHQgeD0iMTAwIiB5PSIyMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiPtmB2YrZhNmFPC90ZXh0Pgo8L3N2Zz4K';
}

// مستمع الرسائل من الإضافة
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'ADD_MOVIE_FROM_EXTENSION':
                const success = addMovieFromExtension(message.data, message.isSeries);
                sendResponse({ success });
                break;

            case 'LOAD_PENDING_MOVIES':
                const result = loadPendingMoviesFromExtension(message.movies);
                sendResponse({ success: true, result });
                break;

            case 'GET_APP_STATUS':
                sendResponse({
                    success: true,
                    appName: 'New Koktil-aflam v32',
                    moviesCount: appState.movies.length,
                    seriesCount: appState.series.length
                });
                break;

            case 'GET_CATEGORIES':
                sendResponse({
                    success: true,
                    categories: appState.categories
                });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }

        return true; // للإشارة إلى أن الرد سيكون غير متزامن
    });
}

// وظائف إدارة المواقع المخفية
function showHiddenSitesSection() {
    const hiddenSitesSection = document.getElementById('hidden-sites-section');
    if (hiddenSitesSection) {
        hiddenSitesSection.classList.remove('hidden');
        populateHiddenSitesList();

        // التمرير إلى القسم الجديد
        setTimeout(() => {
            hiddenSitesSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }
}

function hideHiddenSitesSection() {
    const hiddenSitesSection = document.getElementById('hidden-sites-section');
    if (hiddenSitesSection) {
        hiddenSitesSection.classList.add('hidden');
    }
}

function populateHiddenSitesList() {
    const hiddenSitesList = document.getElementById('hidden-sites-list');
    if (!hiddenSitesList) return;

    // جمع جميع المواقع المخفية
    const hiddenSites = getHiddenSites();

    if (hiddenSites.length === 0) {
        hiddenSitesList.innerHTML = `
            <div class="hidden-sites-empty">
                <i class="fas fa-eye"></i>
                <h4>لا توجد مواقع مخفية</h4>
                <p>جميع المواقع ظاهرة حالياً. يمكنك إخفاء أفلام أي موقع من خلال إدارة المواقع أو إدارة الأفلام.</p>
            </div>
        `;
        showToast('لا توجد مواقع مخفية حالياً', 'info');
        return;
    }

    // إنشاء قائمة المواقع المخفية
    let sitesHTML = '';
    hiddenSites.forEach(siteData => {
        sitesHTML += `
            <div class="hidden-site-item" data-site="${siteData.site}">
                <div class="hidden-site-info">
                    <div class="hidden-site-icon">
                        <i class="fas fa-globe"></i>
                    </div>
                    <div class="hidden-site-details">
                        <h5>${siteData.site}</h5>
                        <p>${siteData.moviesCount + siteData.seriesCount} عنصر مخفي</p>
                    </div>
                </div>
                <div class="hidden-site-stats">
                    <div class="hidden-site-stat">
                        <span class="stat-number">${siteData.moviesCount}</span>
                        <span class="stat-label">أفلام</span>
                    </div>
                    <div class="hidden-site-stat">
                        <span class="stat-number">${siteData.seriesCount}</span>
                        <span class="stat-label">مسلسلات</span>
                    </div>
                </div>
                <div class="hidden-site-actions">
                    <button class="hidden-site-btn show" onclick="showHiddenSite('${siteData.site}')" title="إعادة إظهار جميع أفلام الموقع">
                        <i class="fas fa-eye"></i>
                        إظهار
                    </button>
                    <button class="hidden-site-btn play" onclick="playRandomFromHiddenSite('${siteData.site}')" title="تشغيل فيلم عشوائي من الموقع">
                        <i class="fas fa-play"></i>
                        تشغيل
                    </button>
                    <button class="hidden-site-btn info" onclick="showHiddenSiteDetails('${siteData.site}')" title="عرض تفاصيل الأفلام المخفية">
                        <i class="fas fa-list"></i>
                        تفاصيل
                    </button>
                </div>
            </div>
        `;
    });

    hiddenSitesList.innerHTML = sitesHTML;
}

function getHiddenSites() {
    const sitesMap = new Map();

    // جمع الأفلام المخفية
    appState.movies.forEach(movie => {
        if (movie.hidden && movie.href) {
            const site = getSiteFromUrl(movie.href);
            if (site) {
                if (!sitesMap.has(site)) {
                    sitesMap.set(site, { site, moviesCount: 0, seriesCount: 0 });
                }
                sitesMap.get(site).moviesCount++;
            }
        }
    });

    // جمع المسلسلات المخفية
    appState.series.forEach(series => {
        if (series.hidden && series.href) {
            const site = getSiteFromUrl(series.href);
            if (site) {
                if (!sitesMap.has(site)) {
                    sitesMap.set(site, { site, moviesCount: 0, seriesCount: 0 });
                }
                sitesMap.get(site).seriesCount++;
            }
        }
    });

    return Array.from(sitesMap.values()).sort((a, b) =>
        (b.moviesCount + b.seriesCount) - (a.moviesCount + a.seriesCount)
    );
}

function showHiddenSite(siteName) {
    if (!siteName) return;

    const modal = document.getElementById('confirm-modal');
    const messageElement = document.getElementById('confirm-message');

    // حساب عدد العناصر المخفية
    const hiddenMoviesCount = appState.movies.filter(movie =>
        movie.hidden && movie.href && getSiteFromUrl(movie.href) === siteName
    ).length;

    const hiddenSeriesCount = appState.series.filter(series =>
        series.hidden && series.href && getSiteFromUrl(series.href) === siteName
    ).length;

    const totalCount = hiddenMoviesCount + hiddenSeriesCount;

    messageElement.textContent = `هل تريد إعادة إظهار جميع العناصر المخفية (${totalCount} عنصر) من موقع "${siteName}"؟`;

    // إظهار المودال
    modal.classList.add('show');

    // زر التأكيد
    document.getElementById('confirm-yes').onclick = () => {
        let shownCount = 0;

        // إظهار الأفلام
        appState.movies.forEach(movie => {
            if (movie.hidden && movie.href && getSiteFromUrl(movie.href) === siteName) {
                movie.hidden = false;
                shownCount++;
            }
        });

        // إظهار المسلسلات
        appState.series.forEach(series => {
            if (series.hidden && series.href && getSiteFromUrl(series.href) === siteName) {
                series.hidden = false;
                shownCount++;
            }
        });

        // حفظ البيانات وتحديث العرض
        saveAppData();
        updateCategoriesCounts();
        renderCategories();
        populateHiddenSitesList(); // تحديث قائمة المواقع المخفية

        modal.classList.remove('show');
        showToast(`تم إظهار ${shownCount} عنصر من موقع "${siteName}" بنجاح`, 'success');
    };

    // زر الإلغاء
    document.getElementById('confirm-no').onclick = () => {
        modal.classList.remove('show');
    };
}

function playRandomFromHiddenSite(siteName) {
    if (!siteName) return;

    // جمع جميع العناصر المخفية من الموقع
    const hiddenItems = [];

    appState.movies.forEach(movie => {
        if (movie.hidden && movie.href && getSiteFromUrl(movie.href) === siteName) {
            hiddenItems.push(movie);
        }
    });

    appState.series.forEach(series => {
        if (series.hidden && series.href && getSiteFromUrl(series.href) === siteName) {
            hiddenItems.push(series);
        }
    });

    if (hiddenItems.length === 0) {
        showToast('لا توجد عناصر مخفية في هذا الموقع', 'warning');
        return;
    }

    // اختيار عنصر عشوائي
    const randomItem = hiddenItems[Math.floor(Math.random() * hiddenItems.length)];

    // تشغيل العنصر
    if (randomItem.href) {
        if (appState.openMoviesExternally) {
            window.open(randomItem.href, '_blank');
        } else {
            openMovieInIframe(randomItem.href, randomItem.name);
        }
        showToast(`تم تشغيل "${randomItem.name}" من موقع "${siteName}"`, 'success');
    }
}

function showHiddenSiteDetails(siteName) {
    if (!siteName) return;

    const modal = document.getElementById('hidden-site-details-modal');
    const modalTitle = document.getElementById('hidden-site-modal-title');
    const moviesList = document.getElementById('hidden-site-movies-list');

    // تحديث عنوان المودال
    modalTitle.textContent = `تفاصيل الموقع المخفي: ${siteName}`;

    // جمع جميع العناصر المخفية من الموقع
    const hiddenMovies = appState.movies.filter(movie =>
        movie.hidden && movie.href && getSiteFromUrl(movie.href) === siteName
    );

    const hiddenSeries = appState.series.filter(series =>
        series.hidden && series.href && getSiteFromUrl(series.href) === siteName
    );

    const allHiddenItems = [...hiddenMovies, ...hiddenSeries];

    if (allHiddenItems.length === 0) {
        moviesList.innerHTML = '<p>لا توجد عناصر مخفية في هذا الموقع</p>';
    } else {
        let itemsHTML = '';
        allHiddenItems.forEach(item => {
            const itemType = hiddenMovies.includes(item) ? 'فيلم' : 'مسلسل';
            const categoryName = getCategoryName(item.category);

            itemsHTML += `
                <div class="hidden-movie-item" data-id="${item.id}">
                    <div class="hidden-movie-info">
                        <h5>${item.name}</h5>
                        <p>${itemType} - ${categoryName}</p>
                    </div>
                    <div class="hidden-movie-actions">
                        <button class="hidden-movie-btn play" onclick="playHiddenItem('${item.id}')" title="تشغيل">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="hidden-movie-btn show" onclick="showHiddenItem('${item.id}')" title="إظهار">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        moviesList.innerHTML = itemsHTML;
    }

    // إعداد زر إظهار جميع الأفلام
    const showAllBtn = document.getElementById('show-all-from-site');
    showAllBtn.onclick = () => {
        showHiddenSite(siteName);
        modal.classList.remove('show');
    };

    // إظهار المودال
    modal.classList.add('show');

    // إعداد أزرار الإغلاق
    const closeButtons = modal.querySelectorAll('.close, .close-modal');
    closeButtons.forEach(btn => {
        btn.onclick = () => {
            modal.classList.remove('show');
        };
    });
}

function playHiddenItem(itemId) {
    const item = [...appState.movies, ...appState.series].find(i => i.id === itemId);
    if (!item || !item.href) return;

    if (appState.openMoviesExternally) {
        window.open(item.href, '_blank');
    } else {
        openMovieInIframe(item.href, item.name);
    }
    showToast(`تم تشغيل "${item.name}"`, 'success');
}

function showHiddenItem(itemId) {
    const item = [...appState.movies, ...appState.series].find(i => i.id === itemId);
    if (!item) return;

    item.hidden = false;

    // حفظ البيانات وتحديث العرض
    saveAppData();
    updateCategoriesCounts();
    renderCategories();
    populateHiddenSitesList(); // تحديث قائمة المواقع المخفية

    // تحديث قائمة التفاصيل إذا كانت مفتوحة
    const modal = document.getElementById('hidden-site-details-modal');
    if (modal.classList.contains('show')) {
        const siteName = getSiteFromUrl(item.href);
        showHiddenSiteDetails(siteName);
    }

    showToast(`تم إظهار "${item.name}" بنجاح`, 'success');
}

// التحقق من البيانات من URL أو التخزين المؤقت
async function checkPendingManualAddData() {
    try {
        // أولاً: التحقق من البيانات في URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('fromExtension') === 'true') {
            const movieData = {
                name: urlParams.get('movieName') || '',
                url: urlParams.get('movieUrl') || '',
                image: urlParams.get('movieImage') || '',
                category: urlParams.get('movieCategory') || 'main'
            };

            console.log('تم العثور على بيانات في URL:', movieData);

            // انتظار تحميل التطبيق بالكامل
            setTimeout(() => {
                // ملء النموذج السريع في الصفحة الأولى
                fillQuickAddFormFromExtension(movieData);
                showToast('تم ملء نموذج الإضافة السريع من الإضافة', 'success');

                // تنظيف URL
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }, 1000);

            return; // لا حاجة للتحقق من التخزين المؤقت
        }

        // ثانياً: التحقق من وجود chrome extension API
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.local.get(['pendingManualAdd']);
            if (result.pendingManualAdd) {
                const movieData = result.pendingManualAdd;

                // التحقق من أن البيانات حديثة (أقل من 5 دقائق)
                const now = Date.now();
                const dataAge = now - (movieData.timestamp || 0);
                const maxAge = 5 * 60 * 1000; // 5 دقائق

                if (dataAge < maxAge) {
                    console.log('تم العثور على بيانات محفوظة مؤقتاً:', movieData);

                    // انتظار تحميل التطبيق بالكامل
                    setTimeout(() => {
                        // ملء النموذج السريع في الصفحة الأولى
                        fillQuickAddFormFromExtension(movieData);
                        showToast('تم ملء نموذج الإضافة السريع من الإضافة', 'success');

                        // حذف البيانات المؤقتة
                        chrome.storage.local.remove(['pendingManualAdd']);
                    }, 1000);
                } else {
                    // حذف البيانات القديمة
                    chrome.storage.local.remove(['pendingManualAdd']);
                }
            }
        }
    } catch (error) {
        console.log('لا يمكن الوصول لتخزين الإضافة:', error);
    }
}

// ملء النموذج السريع من بيانات الإضافة
function fillQuickAddFormFromExtension(movieData) {
    try {
        console.log('ملء النموذج السريع من بيانات الإضافة:', movieData);

        const urlField = document.getElementById('add-movie-url');
        const nameField = document.getElementById('add-movie-name');
        const categoryField = document.getElementById('add-movie-category');

        if (urlField && movieData.url) {
            urlField.value = movieData.url;
        }

        if (nameField && movieData.name) {
            nameField.value = movieData.name;
        }

        if (categoryField && movieData.category) {
            categoryField.value = movieData.category;
        }

        // تمييز الحقول المملوءة
        [urlField, nameField].forEach(field => {
            if (field && field.value) {
                field.style.backgroundColor = '#e8f5e8';
                field.style.border = '2px solid #4CAF50';

                // إضافة تأثير وميض
                field.style.animation = 'pulse 1s ease-in-out 3';
            }
        });

        // التركيز على حقل الرابط
        if (urlField) {
            urlField.focus();
            urlField.select();
        }

        // إزالة التمييز بعد 5 ثوان
        setTimeout(() => {
            [urlField, nameField].forEach(field => {
                if (field) {
                    field.style.backgroundColor = '';
                    field.style.border = '';
                    field.style.animation = '';
                }
            });
        }, 5000);

    } catch (error) {
        console.error('خطأ في ملء النموذج السريع:', error);
    }
}

// ملء نموذج الإضافة اليدوية من بيانات الإضافة
function fillManualAddFormFromExtension(movieData) {
    try {
        console.log('ملء النموذج من بيانات الإضافة:', movieData);

        const nameField = document.getElementById('movie-name');
        const imgField = document.getElementById('movie-img');
        const hrefField = document.getElementById('movie-href');
        const categoryField = document.getElementById('movie-category');

        if (nameField && movieData.name) {
            nameField.value = movieData.name;
        }

        if (imgField && movieData.image) {
            imgField.value = movieData.image;
        }

        if (hrefField && movieData.url) {
            hrefField.value = movieData.url;
        }

        if (categoryField && movieData.category) {
            categoryField.value = movieData.category;
        }

        // تمييز الحقول المملوءة
        [nameField, imgField, hrefField].forEach(field => {
            if (field && field.value) {
                field.style.backgroundColor = '#e8f5e8';
                field.style.border = '2px solid #4CAF50';

                // إضافة تأثير وميض
                field.style.animation = 'pulse 1s ease-in-out 3';
            }
        });

        // إزالة التمييز بعد 5 ثوان
        setTimeout(() => {
            [nameField, imgField, hrefField].forEach(field => {
                if (field) {
                    field.style.backgroundColor = '';
                    field.style.border = '';
                    field.style.animation = '';
                }
            });
        }, 5000);

        // التركيز على حقل الاسم
        if (nameField) {
            nameField.focus();
            nameField.select();
        }

    } catch (error) {
        console.error('خطأ في ملء النموذج:', error);
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    // التحقق من البيانات المحفوظة مؤقتاً من الإضافة
    checkPendingManualAddData();
});