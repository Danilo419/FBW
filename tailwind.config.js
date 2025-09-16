/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      container: { center: true, padding: "1rem" },
      colors: {
        brand: {
          50:"#eef5ff",100:"#d9eaff",200:"#b7d3ff",300:"#8db4ff",
          400:"#6394ff",500:"#3b82f6",600:"#2f6bd1",700:"#2656a6",
          800:"#1f467f",900:"#1b3965",
        },
      },
      fontFamily: { outfit: ["Outfit","ui-sans-serif","system-ui"] },
      borderRadius: { "2xl":"1.25rem","3xl":"1.75rem" },
      boxShadow: {
        glow:"0 10px 30px -12px rgba(2,8,23,.18), 0 20px 60px -24px rgba(37,99,235,.25)",
      },
      keyframes: {
        marquee:{ "0%":{transform:"translateX(0)"},"100%":{transform:"translateX(-50%)"} },
        float:{ "0%,100%":{transform:"translateY(0)"},"50%":{transform:"translateY(-6px)"} },
        shimmer:{ "100%":{transform:"translateX(100%)"} },
      },
      animation: {
        marquee:"marquee 20s linear infinite",
        float:"float 4s ease-in-out infinite",
        shimmer:"shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
}
