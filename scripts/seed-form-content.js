import { db, initFirebase } from "../src/config/firebase.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function seedFormContent() {
  console.log("🌱 Seeding form content...");

  // Initialize Firebase first
  initFirebase();

  try {
    // Tạo form_header document với ID cố định
    const formHeaderRef = db().collection('form_header').doc('main');
    await formHeaderRef.set({
      header_id: 'main',
      message: "Chào mừng bạn đến với Stone Real Estate - Nền tảng bất động sản hàng đầu",
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log("✅ Created form_header document");

    // Tạo footer document với ID cố định  
    const footerRef = db().collection('footer').doc('main');
    await footerRef.set({
      footer_id: 'main',
      message: "© 2025 Stone Real Estate. Tất cả quyền được bảo lưu. Liên hệ: info@stonerealestate.com | Hotline: 1900-XXX-XXX",
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log("✅ Created footer document");

    console.log("🎉 Form content seeding completed!");
    
  } catch (error) {
    console.error("❌ Error seeding form content:", error);
    process.exit(1);
  }
}

seedFormContent();