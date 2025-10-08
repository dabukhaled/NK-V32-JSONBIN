// خدمة للتعامل مع JSONBin.io
const JSONBIN_API_KEY = "$2a$10$TBfNnIDrcr/RV5yrw0tZCO52zK/t7JSa.eCDWsaFqbpFJFEN7KIOe";
const JSONBIN_BIN_ID = "68e51a78ae596e708f094780";
const JSONBIN_URL = "https://api.jsonbin.io/v3/b/" + JSONBIN_BIN_ID;

// دالة لحفظ البيانات إلى JSONBin
async function saveToJSONBin(data) {
    try {
        const response = await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY,
                'X-Bin-Meta': false
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`فشل حفظ البيانات: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('تم حفظ البيانات بنجاح إلى JSONBin');
        return result;
    } catch (error) {
        console.error('خطأ أثناء حفظ البيانات إلى JSONBin:', error);
        throw error;
    }
}

// دالة لتحميل البيانات من JSONBin
async function loadFromJSONBinService() {
    try {
        const response = await fetch(JSONBIN_URL, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'X-Bin-Meta': false
            }
        });

        if (!response.ok) {
            throw new Error(`فشل تحميل البيانات: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('تم تحميل البيانات بنجاح من JSONBin');
        return data;
    } catch (error) {
        console.error('خطأ أثناء تحميل البيانات من JSONBin:', error);
        throw error;
    }
}

// دالة مزج البيانات المحملة من JSONBin مع البيانات الحالية
function mergeData(existingData, newData) {
    // تحديث البيانات الأساسية
    if (newData.version) existingData.version = newData.version;
    if (newData.lastUpdated) existingData.lastUpdated = newData.lastUpdated;

    // دمج الأفلام مع تجنب التكرار
    if (newData.movies && Array.isArray(newData.movies)) {
        const existingMovies = existingData.movies || [];
        const newMovies = newData.movies;

        // إنشاء مجموعة من معرفات الأفلام الحالية
        const existingMovieIds = new Set(existingMovies.map(movie => movie.id));

        // إضافة الأفلام الجديدة التي لا توجد بالفعل
        for (const movie of newMovies) {
            if (!existingMovieIds.has(movie.id)) {
                existingMovies.push(movie);
            }
        }

        existingData.movies = existingMovies;
    }

    // دمج المسلسلات مع تجنب التكرار
    if (newData.series && Array.isArray(newData.series)) {
        const existingSeries = existingData.series || [];
        const newSeries = newData.series;

        // إنشاء مجموعة من معرفات المسلسلات الحالية
        const existingSeriesIds = new Set(existingSeries.map(series => series.id));

        // إضافة المسلسلات الجديدة التي لا توجد بالفعل
        for (const series of newSeries) {
            if (!existingSeriesIds.has(series.id)) {
                existingSeries.push(series);
            }
        }

        existingData.series = existingSeries;
    }

    // تحديث الأقسام
    if (newData.categories) {
        // دمج الأقسام الرئيسية
        if (newData.categories.main && Array.isArray(newData.categories.main)) {
            const existingMain = existingData.categories.main || [];
            const newMain = newData.categories.main;

            // تحديث أو إضافة الأقسام الرئيسية
            for (const newCat of newMain) {
                const existingIndex = existingMain.findIndex(cat => cat.id === newCat.id);
                if (existingIndex !== -1) {
                    existingMain[existingIndex] = { ...existingMain[existingIndex], ...newCat };
                } else {
                    existingMain.push(newCat);
                }
            }

            existingData.categories.main = existingMain;
        }

        // دمج الأقسام الفرعية
        if (newData.categories.sub && Array.isArray(newData.categories.sub)) {
            const existingSub = existingData.categories.sub || [];
            const newSub = newData.categories.sub;

            // تحديث أو إضافة الأقسام الفرعية
            for (const newCat of newSub) {
                const existingIndex = existingSub.findIndex(cat => cat.id === newCat.id);
                if (existingIndex !== -1) {
                    existingSub[existingIndex] = { ...existingSub[existingIndex], ...newCat };
                } else {
                    existingSub.push(newCat);
                }
            }

            existingData.categories.sub = existingSub;
        }

        // دمج الأقسام الخاصة
        if (newData.categories.special && Array.isArray(newData.categories.special)) {
            const existingSpecial = existingData.categories.special || [];
            const newSpecial = newData.categories.special;

            // تحديث أو إضافة الأقسام الخاصة
            for (const newCat of newSpecial) {
                const existingIndex = existingSpecial.findIndex(cat => cat.id === newCat.id);
                if (existingIndex !== -1) {
                    existingSpecial[existingIndex] = { ...existingSpecial[existingIndex], ...newCat };
                } else {
                    existingSpecial.push(newCat);
                }
            }

            existingData.categories.special = existingSpecial;
        }

        // دمج الأقسام الخاصة الفرعية
        if (newData.categories.specialSub && Array.isArray(newData.categories.specialSub)) {
            const existingSpecialSub = existingData.categories.specialSub || [];
            const newSpecialSub = newData.categories.specialSub;

            // تحديث أو إضافة الأقسام الخاصة الفرعية
            for (const newCat of newSpecialSub) {
                const existingIndex = existingSpecialSub.findIndex(cat => cat.id === newCat.id);
                if (existingIndex !== -1) {
                    existingSpecialSub[existingIndex] = { ...existingSpecialSub[existingIndex], ...newCat };
                } else {
                    existingSpecialSub.push(newCat);
                }
            }

            existingData.categories.specialSub = existingSpecialSub;
        }
    }

    // تحديث الإعدادات
    if (newData.settings) {
        const existingSettings = existingData.settings || {};
        existingData.settings = { ...existingSettings, ...newData.settings };
    }

    return existingData;
}

// دالة لتحديث lastUpdated
function updateTimestamp(data) {
    data.lastUpdated = new Date().toISOString();
    return data;
}
