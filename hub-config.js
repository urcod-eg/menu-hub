/* ─────────────────────────────────────────────────────────────
   URCOD Dev Panel — إعدادات مشروع «الهَب»
   مشروع Firebase واحد بتاعك إنت (خطة Spark)، فيه سجل العملاء بس.
   بيانات كل مطعم بتفضل في مشروع Firebase الخاص بيه.
   ───────────────────────────────────────────────────────────── */
window.HUB_CONFIG = {
  /* بريد المطوّر: نفس البريد اللي في firestore.rules عند كل عميل وفي hub.rules */
  devEmail: "",

  /* إعدادات مشروع الهَب: Firebase Console › Project settings › Web app */
  firebase: {
    apiKey: "AIzaSyBJecmGdZAdqcvdFCkAZ-llbtvKEzWWy6M",
    authDomain: "menu-hub-9784d.firebaseapp.com",
    projectId: "menu-hub-9784d",
    appId: "1:224971407321:web:2beb0c5a7f11f08c79a3c8"
  },

  /* true = يشتغل من غير Firebase ببيانات وهمية (للتجربة) */
  demo: false,

  firebaseSdk: "10.12.2"
};
