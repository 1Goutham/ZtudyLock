"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="flex justify-between items-center px-4 md:px-20 py-10">
        <div className="flex flex-row gap-3">
      <Image src="/assets/ztudylockLogo.png" alt="Logo" width={30} height={20} />
      <h1 className="text-white font-medium text-lg"><span className="font-light">Ztudy</span>Lock</h1>
      </div>
      <button
  className="w-[110px] h-[40px] px-[5px] text-[15px] text-[#FDD2C1] font-poppins
             flex items-center justify-center gap-[5px] rounded-[10px] cursor-pointer
             border border-[#FDD2C180] 
             bg-[radial-gradient(circle,#fdd2c12e_0%,#fdd2c100_100%)] 
             backdrop-blur-[275px] 
             shadow-[inset_-5px_-5px_250px_#ffffff08] 
             transition duration-200 ease-in-out 
             hover:brightness-110 hover:scale-105"
  onClick={() =>
    window.location.href =
      "https://www.linkedin.com/in/goutham-g-98a0ba253/"
  }
>
  Contact
  <Image src="/assets/ArrowUpRight.png" alt="Arrow" width={10} height={10} />
</button>
    </header>
  );
}