import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'LandingLayout',
  standalone: true,
  imports: [
    RouterLink
  ],
  template:
    `

      <div class=" h-[100vh] overflow-x-hidden " >
        <!-- navbar -->
        <nav class="bg-green-500 font-sans px-10 ">
          <div class=" flex justify-between items-center mx-auto max-w-[1200px] xl:px-0 py-5 " >
            <a href="#" class="flex items-center gap-2 text-white">
              <svg class="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4h16v16H4zM8 8h8v8H8z"/>
              </svg>
              <span class="text-xl font-bold tracking-wide">Ruscord</span>
            </a>

            <ul class=" hidden xl:flex justify-between text-white gap-10 font-[600] text-[16px] " >
              <li>
                <a href="#" class=" hover:underline " >Загрузить</a>
              </li>
              <li>
                <a href="#" class=" hover:underline " >О нас</a>
              </li>
              <li>
                <a href="#" class=" hover:underline " >Надежность</a>
              </li>
              <li>
                <a href="#" class=" hover:underline " >Поддержка</a>
              </li>
              <li>
                <a href="#" class=" hover:underline " >Новости</a>
              </li>
              <li>
                <a href="#" class=" hover:underline " >Карьера</a>
              </li>
            </ul>
            <a routerLink="/channels/me" class=" bg-white rounded-full px-4 py-[0.6rem] text-sm hover:shadow-lg text-main-surface-primary" >Вход</a>
          </div>
        </nav>

        <!-- hero section -->
        <section class="bg-green-500 font-sans relative px-5">
          <img src="./images/Image0.svg" alt="" class="absolute z-10 hidden xl:block bottom-0 top-auto scale-x-125">
          <img src="./images/Image1.svg" alt="" class="absolute z-10 hidden xl:block bottom-0 -right-[28%]">
          <img src="./images/Image2.svg" alt="" class="absolute z-10 hidden xl:block bottom-0 -left-[32%]">

          <!-- content box -->
          <div class="flex flex-col gap-8 relative justify-center items-center text-white container max-w-[1200px] xl:px-0 px-7 xl:max-w-[900px] mx-auto text-center xl:h-[555px] pb-[50px] pt-[10px]">
            <h2 class="z-20 text-left xl:text-center text-[34px] md:text-[56px] font-semibold">
              Место, где общение становится ближе
            </h2>
            <p class="font-sans text-left xl:text-center text-[16px] md:text-[18px] leading-[26px] md:leading-[32.5px] w-[90%] md:w-[70%] xl:w-[87%] z-20">
              ...где ты можешь собираться с друзьями, участвовать в любимых сообществах или просто отдыхать после долгого дня. Приватные чаты, голосовые звонки и удобные каналы — всё, что нужно для комфортного общения в одном месте.
            </p>

            <div class="hidden xl:flex items-center justify-between gap-6 font-[500] z-20">
              <a href="#" class="bg-white text-black rounded-full hover:shadow-lg font-sans hover:text-green-500 p-3 px-7 text-xl flex items-center">
                <svg class="w-6 h-6 text-gray-800 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4"/>
                </svg>
                Скачать для Windows
              </a>
              <a routerLink="channels/me" class="bg-[#23272a] rounded-full hover:shadow-lg p-3 px-7 font-sans text-xl">
                Открыть в браузере
              </a>
            </div>
          </div>
        </section>

        <footer class="bg-main-surface-primary text-white ">
          <div class=" flex flex-col max-w-[1200px] mx-auto font-['ggSans'] gap-10 pb-14 pt-24 px-2 " >
            <!-- top -->
            <div class=" flex justify-between xl:gap-[100px] gap-[40px] flex-col md:flex-row flex-wrap sm:flex-nowrap mx-5 lg:mx-0" >
              <!-- left -->
              <div class=" flex flex-col gap-[24px] w-[100%] md:w-[50%] xl:w-[20%] " >
                <h2 class="text-green-500 font-bold font-sans text-[32px] leading-[30.4px] " >Место, где общение становится ближе</h2>
              </div>

              <!-- right -->
              <div class=" grid grid-cols-2 lg:grid-cols-4 mr-12 gap-[4.2rem] " >
                <!-- col1 -->
                <div class="flex flex-col gap-2 leading-[24px] font-sans" >
                  <p class="text-green-500 text-[16px]" >Продукт</p>
                  <a href="#" class=" block hover:underline">Загрузить</a>
                  <a href="#" class=" block hover:underline">Магазин</a>
                  <a href="#" class=" block hover:underline">Статус</a>
                </div>

                <!-- col2 -->
                <div class="flex flex-col gap-2 leading-[24px] font-sans" >
                  <p class=" text-green-500 text-[16px] " >Компания</p>
                  <a href="#" class=" block hover:underline " >О нас</a>
                  <a href="#" class=" block hover:underline " >Работа</a>
                  <a href="#" class=" block hover:underline " >Брендбук</a>
                  <a href="#" class=" block hover:underline " >Новостная лента</a>
                </div>

                <div class="flex flex-col gap-2 leading-[24px] font-sans" >
                  <p class=" text-green-500 text-[16px] " >Политика</p>
                  <a href="#" class=" block hover:underline " >Соглашение</a>
                  <a href="#" class=" block hover:underline " >Обработка данных</a>
                  <a href="#" class=" block hover:underline " >Рекомендации</a>
                  <a href="#" class=" block hover:underline " >Модерация</a>
                </div>
              </div>
            </div>

            <!-- bottom -->
            <div class=" flex justify-between items-center border-t-2 border-green-500 pt-7 mx-5 lg:mx-0 " >
              <a href="" class="" >
                <img src="./images/logo.svg" alt="" class="  " >
              </a>
              <a href="" class=" rounded-full bg-green-500 px-[16px] py-[7px] leading-[24px] text-[14px] font-sans" >Вход</a>
            </div>
          </div>

        </footer>

      </div>

    `
})

export class LandingLayout {}
