import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const CMS_PK = 'CMS#SITE';

export const getCms = async () => {
  const { Item } = await docClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: CMS_PK, SK: 'CMS' }
  }));
  return Item || getDefaultCms();
};

export const updateCmsSection = async (sectionPath: string, data: any) => {
  const current = (await getCms()) as any;
  const updated = { ...current };
  
  const parts = sectionPath.split('.');
  let target = updated;
  
  // Traverse to the parent of the final key
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!target[part]) target[part] = {};
    target[part] = { ...target[part] }; // Ensure shallow copy for immutability during traversal
    target = target[part];
  }
  
  // Update the final key
  const finalKey = parts[parts.length - 1];
  target[finalKey] = data;

  await docClient.send(new PutCommand({ 
    TableName: MAIN_TABLE, 
    Item: { 
      PK: CMS_PK, 
      SK: 'CMS',
      ...updated
    } 
  }));
  
  return updated;
};

const getDefaultCms = () => ({
  PK: CMS_PK, SK: 'CMS',
  home: {
    carousel: [
      {
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e07?q=80&w=2070',
        title: 'Unleash Your Dynamite Style',
        subtitle: 'Premium apparel engineered for the modern individual.',
        button1: { text: 'Shop The Collection', link: '/shop' },
        button2: { text: 'Our Story', link: '/about' }
      },
      {
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070',
        title: 'Spring Collection 2026',
        subtitle: 'Fresh aesthetics for the vibrant season ahead.',
        button1: { text: 'Shop New Arrivals', link: '/shop?category=Men' },
        button2: { text: '', link: '' }
      }
    ],
    megaPromos: [
      { title: 'Summer Flash Sale', subtitle: 'Up to 50% Off', image: 'https://images.unsplash.com/photo-1523381210434-271e8be1F52b?q=80&w=2000', link: '/shop' },
      { title: 'New Basics', subtitle: 'Buy 2 Get 1 Free', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=2000', link: '/shop' }
    ],
    videoBlock: {
      title: 'Move With Explosive Confidence.',
      subtitle: 'We source only the finest fabrics worldwide to create garments that move with you, not against you. Engineered to withstand the rigors of modern life while looking effortlessly chic.',
      videoUrl: 'https://cdn.pixabay.com/video/2016/09/13/5095-181155989_large.mp4',
      perks: [
        '✓ Breathable Organic Cottons',
        '✓ 30-Day Limitless Returns',
        '✓ Lightning Fast Delivery'
      ]
    },
    vipBanner: {
      title: 'Unlock The VIP Experience',
      subtitle: 'Join the Dynamite Club today and get exclusive early access to our limited drops, free premium shipping on all orders, and 15% off your very first purchase.',
      buttonText: 'Become a Member',
      buttonLink: '/login'
    },
    whatWeDo: {
      title: 'What We Do',
      subtitle: 'If you can imagine it, we can create it. From custom printed game jerseys and corporate apparel to premium hand-embroidered lehengas and saris with select silks and stones.',
      image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1000&auto=format&fit=crop',
      buttonText: 'Customize Your Own Design',
      buttonLink: '/customize'
    },
    categories: [
      { name: "Men's Collection", buttonText: 'Shop Men', link: '/shop?category=Men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=800&auto=format&fit=crop' },
      { name: "Women's Collection", buttonText: 'Shop Women', link: '/shop?category=Women', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop' },
      { name: "Kids' Collection", buttonText: 'Shop Kids', link: '/shop?category=Kids', image: 'https://images.unsplash.com/photo-1514090225131-7b0df0c8f180?q=80&w=800&auto=format&fit=crop' }
    ],
    trustFeatures: [
      { title: 'Free Shipping', subtitle: 'On all orders above ₹100' },
      { title: '30 Days Return', subtitle: 'No questions asked policy' },
      { title: 'Secure Payments', subtitle: '100% secure encrypted checkout' }
    ],
    productSections: {
      newArrivals: { title: 'Fresh Arrivals', subtitle: 'The latest threads dropped this week.' },
      mostPopular: { title: 'Most Popular', subtitle: 'Our top selling favorites this season.' }
    },
    newsletter: {
      title: 'Subscribe to our newsletter',
      subtitle: 'Get the latest updates on new products and upcoming sales directly to your inbox.'
    }
  },
  standard: {
    title: 'The Wear Dynamite Standard',
    subtitle: 'Uncompromising quality from thread to finish.',
    features: [
      { title: '100% Organic Fabric', description: 'Sourced from sustainable farms, our super-combed cotton ensures breathability.', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=2000' },
      { title: 'Heavyweight 240+ GSM', description: 'Built to last. The dense construction ensures garment retains its shape.', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=2000' }
    ]
  },
  process: {
    hero: {
      title: 'Our Process & Craftsmanship',
      subtitle: 'Take a look behind the curtain. Discover what we have and how we deliver luxury-grade apparel.',
      image: 'https://images.unsplash.com/photo-1563823293806-03f140026e6d?q=80&w=2000'
    },
    steps: [
      { title: '1. Sourcing & Raw Materials', have: 'Ethical relationships with sustainable cotton farms.', do: 'Before cutting, fabrics undergo tension and washing tests.' },
      { title: '2. Printing & Embroidery', have: 'Automated HD screen printing presses.', do: 'We apply high-density, crack-resistant inks.' }
    ],
    cta: {
      title: 'Experience The Difference',
      subtitle: "Now that you know how it's made, feel it for yourself.",
      buttonText: 'SHOP THE COLLECTION',
      buttonLink: '/shop'
    }
  },
  contact: {
    title: 'Contact Us',
    subtitle: "We'd love to hear from you. Please fill out the form or reach out directly.",
    direct: {
      phone: ['+91 8543996159', '+91 8382833516'],
      email: 'skshivanshu1234@gmail.com'
    },
    mapUrl: 'https://www.google.com/maps/embed?pb=...'
  },
  policies: {
    shipping: '30 days no questions asked returns.',
    faq: [
      { id: 1, q: 'How long does shipping take?', a: 'Standard delivery takes 3-5 business days across India.' }
    ],
    privacy: 'Your data is protected by encryption.',
    terms: {
      pageTitle: 'Terms of Service',
      subtitle: 'Please read these terms carefully before using our service.',
      lastUpdated: 'April 2026',
      items: [
        { title: 'Introduction', content: 'By using our site, you agree to our terms...' },
        { title: 'Intellectual Property', content: 'All content on this site is owned by Wear Dynamite.' }
      ]
    }
  }
});
