'use client'

import { HelpCircle, Calculator, TrendingUp, BarChart3, CheckCircle } from 'lucide-react'

export function ValuationGuide() {
  return (
    <div className="bg-white border border-medium-gray-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-medium-gray-border">
        <h3 className="text-heading-4 font-serif text-medium-black flex items-center">
          <HelpCircle className="w-5 h-5 mr-2 text-medium-black-secondary" />
          밸류에이션 가이드
        </h3>
      </div>
      
      <div className="p-6 space-y-8">
        {/* How it works */}
        <div>
          <h4 className="text-body font-medium text-medium-black mb-4">밸류에이션 방법</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-6 bg-medium-gray-light rounded-lg">
              <Calculator className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h5 className="text-body-small font-medium text-medium-black mb-2">멀티플 방식</h5>
              <p className="text-caption text-medium-black-secondary leading-relaxed">
                업종 평균 멀티플을 적용하여 기업가치를 산정합니다
              </p>
            </div>
            <div className="text-center p-6 bg-medium-gray-light rounded-lg">
              <TrendingUp className="w-8 h-8 text-medium-green mx-auto mb-3" />
              <h5 className="text-body-small font-medium text-medium-black mb-2">성장률 조정</h5>
              <p className="text-caption text-medium-black-secondary leading-relaxed">
                월 성장률에 따라 기업가치를 조정합니다
              </p>
            </div>
            <div className="text-center p-6 bg-medium-gray-light rounded-lg">
              <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h5 className="text-body-small font-medium text-medium-black mb-2">업종 벤치마킹</h5>
              <p className="text-caption text-medium-black-secondary leading-relaxed">
                동종 업계 기업들과 비교하여 상대적 가치를 평가합니다
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div>
          <h4 className="text-body font-medium text-medium-black mb-4">정확한 밸류에이션을 위한 팁</h4>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-medium-green text-white rounded-full flex items-center justify-center text-caption font-medium mr-3">
                1
              </div>
              <div className="flex-1">
                <p className="text-body-small font-medium text-medium-black mb-1">정확한 재무 데이터 입력</p>
                <p className="text-caption text-medium-black-secondary leading-relaxed">
                  최근 3-6개월 평균 매출과 순이익을 입력하세요. 일시적인 변동보다는 안정적인 평균값이 정확합니다.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-medium-green text-white rounded-full flex items-center justify-center text-caption font-medium mr-3">
                2
              </div>
              <div className="flex-1">
                <p className="text-body-small font-medium text-medium-black mb-1">적절한 업종 선택</p>
                <p className="text-caption text-medium-black-secondary leading-relaxed">
                  주요 수익원에 맞는 업종을 선택하세요. 복합 비즈니스의 경우 매출 비중이 가장 큰 업종을 선택합니다.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-medium-green text-white rounded-full flex items-center justify-center text-caption font-medium mr-3">
                3
              </div>
              <div className="flex-1">
                <p className="text-body-small font-medium text-medium-black mb-1">성장률 고려</p>
                <p className="text-caption text-medium-black-secondary leading-relaxed">
                  지속 가능한 성장률을 입력하세요. 단기적인 스파이크보다는 장기적인 트렌드가 중요합니다.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-medium-green text-white rounded-full flex items-center justify-center text-caption font-medium mr-3">
                4
              </div>
              <div className="flex-1">
                <p className="text-body-small font-medium text-medium-black mb-1">정기적인 업데이트</p>
                <p className="text-caption text-medium-black-secondary leading-relaxed">
                  분기마다 밸류에이션을 업데이트하여 비즈니스 성장을 추적하세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <HelpCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body-small font-medium text-blue-900 mb-2">중요 안내</p>
              <ul className="space-y-1">
                <li className="text-caption text-blue-800 flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  이 밸류에이션은 참고용이며, 실제 거래 시에는 전문가 상담을 권장합니다
                </li>
                <li className="text-caption text-blue-800 flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  시장 상황과 개별 기업의 특성에 따라 실제 가치는 달라질 수 있습니다
                </li>
                <li className="text-caption text-blue-800 flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  업종별 멀티플은 주기적으로 업데이트되며, 최신 시장 데이터를 반영합니다
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}