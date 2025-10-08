// Load app data on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // تحميل البيانات من JSONBin أولاً وانتظار انتهاء العملية
        await loadFromJSONBin();

        // بعد تحميل البيانات من السحابة بنجاح، استمر في باقي الكود
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
            autoSaveCheckbox.checked = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_SPEED) === 'true';
        }
    } catch (error) {
        console.error('فشل تحميل البيانات من JSONBin:', error);

        // في حالة فشل تحميل البيانات من السحابة، استخدم البيانات المحلية
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
            autoSaveCheckbox.checked = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE_SPEED) === 'true';
        }
    }
});