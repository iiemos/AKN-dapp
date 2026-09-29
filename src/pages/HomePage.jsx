import { useNavigate } from "react-router-dom";
import { PACKAGES } from "../data/packages";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <section className="view active">
      <div className="earth hero">
        <div className="ewm"><span className="a">A</span><span className="k">K</span><span className="n">N</span></div>
        <div className="et">源于代码，律于共识</div>
        <div className="eln" />
        <div className="een">CODE · LIQUIDITY · CONSENSUS</div>
      </div>

      <div className="card">
        <h3><span className="bar" />项目介绍</h3>
        <div className="note-box">
          AKN（源律）是运行在 BNB Smart Chain 上的预售与网体协议。会员先注册推荐关系，再按套餐参与预售。资金按比例进入保险池与交互合约，合约开源并丢弃权限。
        </div>
        <div className="note-box">
          预售期每 24 小时统一按 1% 结算 LP，暂不可领取。正式上线后恢复套餐日静态收益，领取时同步结算代数奖、团队奖与小区分红。保险池可随时赎回，赎回后该笔订单结束。
        </div>
      </div>

      <div className="card">
        <h3><span className="bar" />四种套餐</h3>
        <div className="intro-list">
          {PACKAGES.map((item) => (
            <div className="intro-row" key={item.tag}>
              <span className="intro-rate">{item.rate}%</span>
              <span className="intro-name">{item.tag}</span>
              <span className="intro-split">投资 {item.interact}% · 保险 {item.insurance}%</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-blue" type="button" onClick={() => navigate("/invest")}>
        前往投资
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </section>
  );
}
