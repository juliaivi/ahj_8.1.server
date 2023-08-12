import http from "http";
import express from "express";
import WebSocket, { WebSocketServer } from "ws"; // для общения сервака и клиента.Протокол связи поверх TCP-соединения, предназначенный для обмена сообщениями между браузером и веб-сервером, используя постоянное соединение. 
import cors from "cors";// CORS - это node.js пакет для предоставления промежуточного программного обеспечения Connect / Express, которое можно использовать для включения CORS с различными опциями
import bodyParser from "body-parser";// Node.js промежуточное программное обеспечение для разбора тела. Для того, что бы можно было считывать данные в разных форматах из тела запроса, то есть реализация request.body
import * as crypto from "crypto"; // crypto и uuid - две зависимости, которые генерят рандомные айдишники


const app = express();
//app.use - разрешаем крос доменные запросы
app.use(cors());//cors() - использовать корс  пробрасывание мидлвейр, ЭТО ФУНКЦИЯ УСТРОЕНАЯ СПЕЦИАЛЬНЫМ ОБРАЗОМ, которая будет вызвана при каждой обработке http  запроса с помощью express
app.use(
  bodyParser.json({// считывать данные json
    type(req) {  //type Параметр используется для определения типа носителя, который будет обрабатываться промежуточным программным обеспечением. Этот параметр может быть строкой, массивом строк или функцией
      return true;
    },
  })
);
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");// Метод response.setHeader (имя, значение) (добавлен в версии 0.4.0) представляет собой встроенный интерфейс прикладного программирования модуля ‘http‘, который устанавливает единственное значение заголовка для неявных заголовков. Если этот заголовок уже существует в заголовках, подлежащих отправке, его значение будет заменено. Используйте массив строк здесь, чтобы отправить несколько заголовков с одинаковым именем. Нестроковые значения будут сохранены без изменений. Следовательно, response.getHeader() может возвращать нестроковые значения.
  next();
});

const userState = []; 
app.post("/new-user", async (request, response) => {
  if (Object.keys(request.body).length === 0) { // Object.keys() возвращает массив из собственных перечисляемых свойств переданного объекта. Если будет пустой
    const result = {
      status: "error",// ошибка
      message: "This name is already taken!", // Это имя уже занято!
    };
    response.status(400).send(JSON.stringify(result)).end(); // вернет ошибку
  }
  const { name } = request.body; // с тела запроса берем имя
  const isExist = userState.find((user) => user.name === name); // сравниваем с текущими именами
  if (!isExist) { // если не находит создает новый объект с таким именем и присваевает айдишник
    const newUser = {
      id: crypto.randomUUID(),
      name: name,
    };
    userState.push(newUser);// добавляет к списку имен
    console.log(1);
    console.log(userState);
    console.log(newUser);
    const result = { // положительный статус который вернет он фронту с новым именем
      status: "ok",
      user: newUser,
    };
    response.send(JSON.stringify(result)).end();// закрытие http запроса
  } else {// вернет ошибку
    const result = {
      status: "error",
      message: "This name is already taken!",// Это имя уже занято
    };
    response.status(409).send(JSON.stringify(result)).end();// закрытие http запроса
  }
});

const server = http.createServer(app); // создание сервера
const wsServer = new WebSocketServer({ server }); // в него передаем текущий настроенный http сервер. Это сущность которая существует паралельно с основным http сервером и использует подключение для своей работ
// теперь сервер для вебсокетов встроился в наш текущий флоу работы
wsServer.on("connection", (ws) => { // прослушка соеденения (подписывание на события)
  ws.on("message", (msg, isBinary) => {// прослушка сообщений
    console.log(1)
    const receivedMSG = JSON.parse(msg); // получить сообщение . Преобразовывает в объект JSON.parse() Статический метод анализирует строку JSON, создавая значение JavaScript или объект, описываемый строкой
    console.dir(receivedMSG); //это способ посмотреть в консоли свойства заданного javascript объекта
    if (receivedMSG.type === "exit") { // выход, если кто-то хочет ути с чата(отключится?)
      const idx = userState.findIndex( // находим такое имя в списке
        (user) => user.name === receivedMSG.name
      );
      userState.splice(idx, 1); // удоляем его из списка
      [...wsServer.clients] // wsServer.clients??
        .filter((o) => o.readyState === WebSocket.OPEN) // фильтруем масив и оставляем только тех кто открыт (есть онлайн)
        .forEach((o) => o.send(JSON.stringify(userState))); // // отправляем каждому список оставшихся собеседников
      return;
    }
    if (receivedMSG.type === "send") { // отправить
      [...wsServer.clients] // массив со всеми участниками
        .filter((o) => o.readyState === WebSocket.OPEN) // смотрим чтоб все были в сети
        .forEach((o) => o.send(msg, { binary: isBinary })); // отправляем каждому сообщение, чтоб отображалось. Что это { binary: isBinary }?
    }
  });
  [...wsServer.clients]// массив со всеми участниками
    .filter((o) => o.readyState === WebSocket.OPEN) // отфильтровывает и оставляет тех кто в сети
    .forEach((o) => o.send(JSON.stringify(userState))); // отправляем каждому список оставшихся собеседников
});

const port = process.env.PORT || 3000;// порт который нужно слушать

const bootstrap = async () => {//  делается все асинхронна, записывая код в try catch 
  try {
    server.listen(port, () =>// слушает  сервер
      console.log(`Server has been started on http://localhost:${port}`)// в консоль выводит сообщение Сервер запущен и указывает порт
    );
  } catch (error) {
    console.error(error);
  }
};

bootstrap();// запуск функции

