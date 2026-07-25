const {chromium} = require('playwright-core');

(async()=>{
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome!');
    console.log('Contexts:', browser.contexts().length);

    const ctx = browser.contexts()[0];
    if(ctx){
      console.log('Pages in context:', ctx.pages().length);
      const pages = ctx.pages();
      if(pages[0]){
        console.log('First page URL:', pages[0].url());
        console.log('Can access page:', !!pages[0]);
      }
    }
  } catch(e){
    console.log('❌ Error:', e.message);
  }
})();
